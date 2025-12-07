// ==UserScript==
// @name         AutoPlay Video Script
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动播放视频、自动关闭弹窗、自动播放下一集
// @author       GitHub Copilot
// @match        http://jjfz.muc.edu.cn/jjfz/play*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 配置项
    const CHECK_INTERVAL = 2000; // 每2秒检查一次状态

    // 日志输出
    function log(msg) {
        console.log(`[AutoPlay]: ${msg}`);
    }

    let retryCount = 0;
    let videoPlaylist = []; // 存储播放列表
    let currentVideoIndex = -1; // 当前视频在播放列表中的索引
    let isJumping = false; // 防止重复跳转
    let endedListenerBound = false; // 跟踪ended事件是否已绑定
    
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

    // 1. 自动播放功能
    function playVideo() {
        const video = document.querySelector('video');
        if (video) {
            // 如果视频已经播放结束，不要重新播放
            if (video.ended) {
                // log('视频已播放结束，等待跳转...');
                return;
            }
            
            // 如果视频暂停了，尝试播放
            if (video.paused) {
                log('检测到视频暂停，尝试播放...');
                
                // 策略1: 尝试直接调用 play()
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        log('视频已开始播放');
                        retryCount = 0;
                    }).catch(error => {
                        log('播放失败 (可能是浏览器限制): ' + error);
                        retryCount++;
                        
                        // 策略2: 如果重试超过3次，尝试静音播放 (浏览器通常允许静音自动播放)
                        if (retryCount > 3 && !video.muted) {
                            log('多次尝试失败，切换到静音播放模式...');
                            video.muted = true;
                            video.play();
                        } else {
                            // 策略3: 尝试点击播放按钮
                            tryClickPlayButton();
                        }
                    });
                }
            } else {
                retryCount = 0;
            }
            
            // 监听 ended 事件，确保只绑定一次
            if (!endedListenerBound) {
                log('准备绑定ended事件监听器...');
                video.addEventListener('ended', function() {
                    log('===== 视频播放结束 =====');
                    log('视频当前时间: ' + video.currentTime + ', 总时长: ' + video.duration);
                    log('等待弹窗出现后自动跳转...');
                    // 不在这里跳转，等待closePopup检测到弹窗后跳转
                }, {once: false});
                endedListenerBound = true;
                log('✓ 已成功绑定视频ended事件监听器');
            }
            
            // 额外检查：防止播放速度过快导致不记录进度
            if (video.playbackRate > 1.0) {
                // log('检测到播放速度非 1.0，建议保持原速以防进度丢失');
                // 如果需要强制原速，可以取消注释下面这行
                // video.playbackRate = 1.0;
            }
        }
    }

    // 尝试点击页面上的播放按钮（针对自定义播放器控件）
    function tryClickPlayButton() {
        // 常见的播放按钮选择器
        const selectors = [
            '.plyr__control--overlaid', 
            '.plyr__controls__item--play',
            '.vjs-big-play-button',
            '.video_click' // 针对本页面的特定选择器
        ];
        
        for (let selector of selectors) {
            const btn = document.querySelector(selector);
            if (btn && btn.offsetParent !== null) { // 检查按钮是否可见
                log(`点击播放按钮: ${selector}`);
                btn.click();
                // 补充：模拟更真实的点击事件 (兼容性更好)
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                btn.dispatchEvent(event);
                break;
            }
        }
    }

    // 2. 自动关闭弹窗
    function closePopup() {
        // 如果正在跳转中，不要处理弹窗
        if (isJumping) {
            return;
        }
        
        // 查找常见的弹窗确认按钮文本
        const targetTexts = ['我知道了', '确定', '继续播放','继续', 'Confirm', 'OK'];
        
        // 查找页面上所有的按钮或链接
        const candidates = document.querySelectorAll('a, button, div.public_submit, div.public_cancel, span');

        let foundPopup = false;
        candidates.forEach(btn => {
            // 忽略不可见的元素
            if (btn.offsetParent === null) return;

            const text = btn.innerText.trim();
            if (targetTexts.includes(text)) {
                foundPopup = true;
            }
        });
        
        // 如果发现弹窗，检查视频是否已结束
        if (foundPopup) {
            const video = document.querySelector('video');
            if (video && video.ended) {
                log('发现播放完毕弹窗，网站已自动记录完成，立即跳转下一集...');
                if (!isJumping) {
                    isJumping = true;
                    playNext();
                }
            } else {
                // 不是播放完毕弹窗（可能是异常行为弹窗），点击关闭
                candidates.forEach(btn => {
                    if (btn.offsetParent === null) return;
                    const text = btn.innerText.trim();
                    if (targetTexts.includes(text)) {
                        log(`发现弹窗按钮 "${text}"，点击关闭`);
                        btn.click();
                    }
                });
            }
        }
    }

    // 3. 自动播放下一集
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

    // 主循环
    function startLoop() {
        setInterval(() => {
            playVideo();
            closePopup();
        }, CHECK_INTERVAL);
    }

    // 初始化
    function init() {
        log('脚本已加载');
        
        // 初始化播放列表
        initPlaylist();
        
        // 启动主循环
        startLoop();
    }

    // 等待页面加载完成
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
