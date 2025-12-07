// ==UserScript==
// @name         Keep Video Playing (强制持续播放)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  通过劫持视频API和阻止暂停事件，强制视频在失去焦点后继续播放
// @author       GitHub Copilot
// @match        http://jjfz.muc.edu.cn/jjfz/play*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 日志输出
    function log(msg) {
        console.log(`[KeepPlaying]: ${msg}`);
    }

    let isUserPause = false; // 标记用户是否主动暂停
    let forcePlayTimer = null;
    let videoPlaylist = []; // 存储播放列表
    let currentVideoIndex = -1; // 当前视频在播放列表中的索引
    let isJumping = false; // 防止重复跳转
    let preventPauseEnabled = false; // 标记是否启用防暂停功能（延迟启用避免初始卡顿）
    let videoHasPlayed = false; // 标记视频是否已经开始播放过

    // 方法1: 劫持 HTMLMediaElement.prototype.pause 方法
    function hijackPauseMethod() {
        const originalPause = HTMLMediaElement.prototype.pause;
        
        HTMLMediaElement.prototype.pause = function() {
            // 如果防暂停功能未启用（视频初始化阶段），允许正常暂停
            if (!preventPauseEnabled) {
                return originalPause.apply(this, arguments);
            }
            
            // 如果是用户点击暂停按钮或者视频已结束，允许暂停
            if (this.ended || isUserPause) {
                log('允许暂停: ' + (this.ended ? '视频已结束' : '用户主动暂停'));
                return originalPause.apply(this, arguments);
            }
            
            // 阻止其他情况的暂停（如失去焦点导致的暂停）
            log('阻止自动暂停');
            return undefined;
        };
        
        log('✓ 已劫持 pause() 方法');
    }

    // 初始化播放列表
    function initPlaylist() {
        log('正在初始化播放列表...');
        
        // 查找所有视频链接
        const allLinks = document.querySelectorAll('.video_lists ul li a');
        videoPlaylist = [];
        
        allLinks.forEach((link, index) => {
            const href = link.getAttribute('href');
            const title = link.innerText.trim();
            
            if (href && href !== '#' && href !== 'javascript:void(0);') {
                // 构建完整URL
                let fullUrl = href;
                if (!href.startsWith('http')) {
                    fullUrl = window.location.origin + href;
                }
                
                videoPlaylist.push({
                    index: index,
                    url: fullUrl,
                    title: title,
                    href: href
                });
            }
        });
        
        log('播放列表初始化完成，共 ' + videoPlaylist.length + ' 个视频');
        
        // 查找当前视频在播放列表中的位置
        const urlParams = new URLSearchParams(window.location.search);
        const currentRid = urlParams.get('r_id');
        
        if (currentRid) {
            for (let i = 0; i < videoPlaylist.length; i++) {
                if (videoPlaylist[i].href.indexOf('r_id=' + currentRid) !== -1) {
                    currentVideoIndex = i;
                    log('当前视频: [' + (i + 1) + '/' + videoPlaylist.length + '] ' + videoPlaylist[i].title);
                    break;
                }
            }
        }
        
        if (currentVideoIndex === -1) {
            log('警告: 无法确定当前视频在播放列表中的位置');
        }
    }

    // 自动播放下一集
    function playNext() {
        log('===== playNext() 函数被调用 =====');
        log('当前播放列表长度: ' + videoPlaylist.length);
        log('当前视频索引: ' + currentVideoIndex);
        
        if (videoPlaylist.length === 0) {
            log('播放列表为空，尝试重新初始化...');
            initPlaylist();
        }
        
        if (currentVideoIndex === -1) {
            log('错误: 无法确定当前视频位置');
            isJumping = false;
            return;
        }
        
        const nextIndex = currentVideoIndex + 1;
        log('计算得到下一个索引: ' + nextIndex);
        
        if (nextIndex >= videoPlaylist.length) {
            log('已到达播放列表末尾');
            isJumping = false;
            return;
        }
        
        const nextVideo = videoPlaylist[nextIndex];
        log('===== 准备跳转 =====');
        log('下一集: [' + (nextIndex + 1) + '/' + videoPlaylist.length + '] ' + nextVideo.title);
        log('跳转URL: ' + nextVideo.url);
        
        // 跳转到下一集
        window.location.href = nextVideo.url;
    }

    // 自动关闭弹窗并跳转（统一处理视频结束和中途弹窗）
    function closePopupAndJump() {
        if (isJumping) {
            return;
        }
        
        // 查找常见的弹窗确认按钮文本
        const targetTexts = ['我知道了', '确定', '继续播放', '继续', 'Confirm', 'OK'];
        
        // 优先查找 Layui 的弹窗按钮，以及其他常见的按钮元素
        const selectors = [
            'a.layui-layer-btn0', // Layui 默认确认按钮
            'a.layui-layer-btn1', // Layui 默认取消按钮
            '.public_submit',     // 自定义确认按钮
            '.public_cancel',     // 自定义取消按钮
            'a', 
            'button', 
            'span'
        ];
        
        const candidates = document.querySelectorAll(selectors.join(','));

        for (let i = 0; i < candidates.length; i++) {
            const btn = candidates[i];
            
            // 忽略不可见的元素
            if (btn.offsetParent === null) continue;

            const text = btn.innerText.trim();
            if (targetTexts.includes(text)) {
                const video = document.querySelector('video');
                
                // 情况1: 视频已结束，跳转下一集
                if (video && video.ended) {
                    log('发现播放完毕弹窗，网站已自动记录完成，立即跳转下一集...');
                    if (!isJumping) {
                        isJumping = true;
                        playNext();
                    }
                    return;
                } 
                // 情况2: 视频未结束（中途弹窗），点击关闭
                else {
                    log('发现中途弹窗按钮: "' + text + '"，尝试点击关闭');
                    
                    // 尝试多种点击方式
                    btn.click();
                    
                    try {
                        // 模拟鼠标点击事件
                        const event = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        btn.dispatchEvent(event);
                    } catch (e) {}
                    
                    return; // 找到并处理一个即可
                }
            }
        }
    }

    // 定时检查弹窗（统一处理所有弹窗）
    function checkPopupInterval() {
        setInterval(() => {
            // 如果正在跳转中，不要处理弹窗
            if (isJumping) {
                return;
            }
            
            // closePopupAndJump 会自动判断：
            // 1. 如果有弹窗 + 视频结束 -> 跳转下一集
            // 2. 如果有弹窗 + 视频播放中 -> 关闭弹窗
            closePopupAndJump();
        }, 2000);
        
        log('✓ 已启动弹窗检查定时器 (每2秒)');
    }

    // 方法2: 拦截并取消所有 pause 事件
    function blockPauseEvents() {
        document.addEventListener('pause', function(e) {
            const video = e.target;
            // 只在防暂停启用后才拦截
            if (video.tagName === 'VIDEO' && !video.ended && !isUserPause && preventPauseEnabled) {
                log('拦截 pause 事件');
                e.stopImmediatePropagation();
                e.preventDefault();
                
                // 稍微延迟恢复播放，避免与其他脚本冲突
                setTimeout(() => {
                    if (video.paused && !video.ended) {
                        video.play().catch(err => log('恢复播放失败: ' + err));
                    }
                }, 100);
            }
        }, true); // 使用捕获阶段，优先级最高
        
        log('✓ 已设置 pause 事件拦截器');
    }

    // 方法3: 已移除 (Object.defineProperty 劫持 paused 属性会导致播放器初始化卡顿)
    // function hijackPausedProperty() { ... }

    // 方法4: 定时强制播放（降低频率避免卡顿）
    function forcePlayInterval() {
        setInterval(() => {
            const video = document.querySelector('video');
            // 只在防暂停启用后才强制播放
            if (video && video.paused && !video.ended && !isUserPause && preventPauseEnabled) {
                log('定时检测到暂停，强制恢复播放');
                video.play().catch(err => {});
            }
        }, 3000); // 每3秒检查一次，避免太频繁导致卡顿
        
        log('✓ 已启动强制播放定时器 (3秒间隔)');
    }

    // 尝试自动点击播放按钮
    function autoClickPlayButton() {
        // 等待页面加载完成后尝试点击
        setTimeout(() => {
            const video = document.querySelector('video');
            if (video && video.paused && !video.ended) {
                log('尝试自动播放视频...');
                
                // 方法1: 直接调用 play()
                video.play().then(() => {
                    log('✓ 视频自动播放成功');
                }).catch(err => {
                    log('直接播放失败，尝试点击播放按钮: ' + err);
                    
                    // 方法2: 尝试点击播放按钮
                    const playButtons = [
                        '.plyr__control--overlaid',
                        '.plyr__controls__item[data-plyr="play"]',
                        'button[data-plyr="play"]',
                        '.video_click',
                        '.plyr__control[data-plyr="play"]'
                    ];
                    
                    for (let selector of playButtons) {
                        const btn = document.querySelector(selector);
                        if (btn) {
                            log('找到播放按钮: ' + selector + '，尝试点击');
                            btn.click();
                            break;
                        }
                    }
                });
            }
        }, 2000); // 延迟2秒，确保页面和播放器完全加载
    }

    // 监听视频开始播放，启用防暂停功能
    function enablePreventPauseAfterPlay() {
        // 使用定时器检查视频播放状态
        const checkInterval = setInterval(() => {
            const video = document.querySelector('video');
            if (video) {
                // 监听 playing 事件（视频真正开始播放）
                video.addEventListener('playing', function() {
                    if (!videoHasPlayed) {
                        videoHasPlayed = true;
                        // 延迟2秒后启用防暂停功能，确保播放器完全初始化
                        setTimeout(() => {
                            preventPauseEnabled = true;
                            log('✓ 视频已开始播放，防暂停功能已启用');
                        }, 2000);
                    }
                }, {once: true});
                
                clearInterval(checkInterval);
            }
        }, 500);
        
        // 10秒后仍未找到视频，停止检查
        setTimeout(() => clearInterval(checkInterval), 10000);
    }

    // 监听用户的主动暂停操作
    function detectUserPause() {
        // 监听播放器控件的点击
        document.addEventListener('click', function(e) {
            const target = e.target;
            // 检查是否点击了暂停按钮
            if (target.closest('.plyr__control--overlaid') || 
                target.closest('[aria-label*="暂停"]') || 
                target.closest('[title*="暂停"]')) {
                isUserPause = true;
                log('检测到用户点击暂停按钮');
                
                // 3秒后重置标记
                setTimeout(() => {
                    isUserPause = false;
                    log('重置用户暂停标记');
                }, 3000);
            }
        }, true);
    }

    // 主初始化函数
    function init() {
        log('脚本已加载 - 强制持续播放模式');
        
        // 初始化播放列表
        initPlaylist();
        
        // 应用所有防暂停方法（初始时不会生效，等待视频开始播放）
        hijackPauseMethod();      // 劫持 pause 方法
        blockPauseEvents();       // 拦截 pause 事件
        // hijackPausedProperty();   // 已移除：劫持 paused 属性会导致卡顿
        forcePlayInterval();      // 定时强制播放
        detectUserPause();        // 检测用户主动暂停
        checkPopupInterval();     // 定时检查弹窗
        enablePreventPauseAfterPlay();  // 监听视频播放，延迟启用防暂停
        autoClickPlayButton();    // 自动点击播放按钮
        
        log('所有防护措施已准备就绪，等待视频开始播放后启用');
    }

    // 尽早执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
