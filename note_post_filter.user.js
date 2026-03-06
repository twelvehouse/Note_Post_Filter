// ==UserScript==
// @name         Note.com Post Filter
// @namespace    https://note.com/mm____/n/n9ae64d1c9400
// @version      4.0
// @description  noteの検索結果や記事から指定したユーザーをミュート・非表示にします
// @author       twelvehouse
// @match        https://note.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @updateURL    https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// @downloadURL  https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// ==/UserScript==

// ミュートリストの取得
let authorsToMuteByName = GM_getValue("authorsToMuteByName", []);
let authorsToMuteByID = GM_getValue("authorsToMuteByID", []);
let useBlurMute = GM_getValue("useBlurMute", true);

// ミュートリスト管理のためのMutationObserver
let observer;

// CSSの追加
GM_addStyle(`
    /* ミュートボタンのスタイル */

    @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.5.0/font/bootstrap-icons.css');

    .custom-muteButton {
        background-color: transparent;
        border: none;
        cursor: pointer;
        position: relative;
        width: 19px;
        height: 19px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    .custom-muteIcon {
        font-size: 15px;
        color: gray;
        transition: color 0.2s ease;
    }
    .custom-muteButton:hover .custom-muteIcon {
        color: red; /* マウスオーバーで色変更 */
    }

    /* 検索結果・タイムライン・記事・コメント用のモザイク（ぼかし）とオーバーレイ */
    .custom-blur-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(8px);
        background-color: rgba(0, 0, 0, 0.25); /* UIに馴染む自然な暗さに調整 */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;
        cursor: pointer;
        border-radius: 8px;
        transition: opacity 0.2s ease, backdrop-filter 0.2s ease;
    }
    .custom-blur-overlay.custom-hover-unmuted {
        opacity: 0;
        pointer-events: none;
        backdrop-filter: blur(0px);
        transition: opacity 0.2s ease, backdrop-filter 0.2s ease;
    }
    .custom-blur-overlay .mute-text {
        font-weight: bold;
        color: #f0f0f0;
        font-size: 26px;
        margin-bottom: 6px;
    }
    .custom-blur-overlay .click-text {
        font-weight: bold;
        color: #ccc;
        font-size: 13px;
    }
    .custom-blur-overlay.article-overlay {
        justify-content: flex-start;
        padding-top: 120px;
    }
    .custom-blurred-item {
        position: relative !important;
    }
`);

// ぼかしオーバーレイを適用するヘルパー関数
function applyBlurOverlay(item, isArticle = false) {
    if (!isArticle && !useBlurMute) {
        item.style.display = 'none';
        return;
    }

    if (!item.querySelector('.custom-blur-overlay') && !item.classList.contains('custom-unmuted')) {
        item.classList.add('custom-blurred-item');
        const overlay = document.createElement('div');
        overlay.className = `custom-blur-overlay ${isArticle ? 'article-overlay' : ''}`;

        if (isArticle) {
            overlay.innerHTML = '<span class="mute-text">ミュート中</span><span class="click-text">クリックで表示</span>';
            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('custom-blurred-item');
                item.classList.add('custom-unmuted');
                overlay.remove();
            });
        } else {
            overlay.innerHTML = '<span class="mute-text">ミュート中</span><span class="click-text">ホバーで表示</span>';

            item.addEventListener('mouseenter', () => {
                overlay.classList.add('custom-hover-unmuted');
            });

            item.addEventListener('mouseleave', () => {
                overlay.classList.remove('custom-hover-unmuted');
            });
        }
        item.appendChild(overlay);
    }
}

// ノート投稿・インタラクション・記事本文をミュートにする
function mutePosts() {
    // タイムラインの投稿
    const notePostElements = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');
    notePostElements.forEach(item => {
        const authorElement = item.querySelector('.o-largeNoteSummary__userName');
        const userLink = item.querySelector('.o-largeNoteSummary__userWrapper a');

        if (authorElement && userLink) {
            const userName = authorElement.textContent.trim();
            const userId = userLink.getAttribute('href').replace(/^\//, "").split('?')[0]; // 先頭の / を削除

            // ミュートリストにユーザー名またはIDが一致する場合
            if (authorsToMuteByName.includes(userName) || authorsToMuteByID.includes(userId)) {
                applyBlurOverlay(item, false);
            }
        }
    });

    // コメント・スキなどのインタラクションの非表示
    const interactionElements = document.querySelectorAll('.o-commentArea__item, .m-userItem');
    interactionElements.forEach(item => {
        const userLink = item.querySelector('a[href^="/"]');
        if (userLink) {
            const userId = userLink.getAttribute('href').replace(/^\//, "").split('?')[0];
            const nameElement = item.querySelector('.a-link, .m-userItem__name');
            const userName = nameElement ? nameElement.textContent.trim() : '';

            if (authorsToMuteByID.includes(userId) || (userName && authorsToMuteByName.includes(userName))) {
                applyBlurOverlay(item, false);
            }
        }
    });

    // 記事本文のブロック（記事ページ）
    const headerAvatar = document.querySelector('a.o-noteContentHeader__avatar, a.o-noteArticleHeader__avatar');
    if (headerAvatar) {
        const userId = headerAvatar.getAttribute('href').replace(/^\//, "").split('?')[0];
        const nameElement = document.querySelector('.o-noteContentHeader__creatorName, .o-noteContentHeader__name, .o-noteArticleHeader__name');
        const userName = nameElement ? nameElement.textContent.trim() : '';

        if (authorsToMuteByID.includes(userId) || (userName && authorsToMuteByName.includes(userName))) {
            const articleBody = document.querySelector('.p-article, .o-noteContentText');
            if (articleBody) {
                applyBlurOverlay(articleBody, true);
            }
        }
    }
}

// ミュートリストの管理
function manageAuthorMuteList(type) {
    const currentList = type === 'name' ? authorsToMuteByName : authorsToMuteByID;
    const inputPrompt = `ミュートにしたい${type === 'name' ? 'ユーザー名' : 'ユーザーID'}をカンマ区切りで入力してください:`;
    const userInput = prompt(inputPrompt, currentList.length > 0 ? currentList.join(", ") : "");

    if (userInput !== null) {
        const newList = userInput.split(",").map(item => item.trim());
        if (type === 'name') {
            authorsToMuteByName = newList;
            GM_setValue("authorsToMuteByName", newList);
        } else {
            authorsToMuteByID = newList;
            GM_setValue("authorsToMuteByID", newList);
        }

        if (confirm("ミュートリストが更新されました。\n変更を反映するためにページをリロードしますか？")) {
            location.reload();
        }
    }
}

// タイムラインや記事の監視と「ミュートボタン」の追加
function monitorTimeline() {
    observer = new MutationObserver(() => {
        // タイムラインへのミュートボタン追加
        const notePostElements = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');
        notePostElements.forEach(item => {
            const authorElement = item.querySelector('.o-largeNoteSummary__userName');
            const userLink = item.querySelector('.o-largeNoteSummary__userWrapper a');

            if (authorElement && userLink) {
                const userName = authorElement.textContent.trim();
                const userId = userLink.getAttribute('href').replace(/^\//, "").split('?')[0];

                const actionContainer = item.querySelector('.o-noteAction');
                if (actionContainer && !item.querySelector('.custom-muteButton')) {
                    const muteButton = createMuteButton(userName, userId);
                    actionContainer.appendChild(muteButton);
                }
            }
        });

        // コメント欄へのミュートボタン追加
        const commentElements = document.querySelectorAll('.o-commentArea__item');
        commentElements.forEach(item => {
            const userLink = item.querySelector('a[href^="/"]');
            if (userLink && !item.querySelector('.custom-muteButton')) {
                const userId = userLink.getAttribute('href').replace(/^\//, "").split('?')[0];
                const nameElement = item.querySelector('a.font-semibold, .a-link');
                const userName = nameElement ? nameElement.textContent.trim() : '';

                // ボタンを追加するためのコンテナ（名前とアイコンが並んでいるヘッダー部分）
                const headerContainer = item.querySelector('.flex.items-center.justify-between') || (nameElement ? nameElement.parentNode : null);
                if (userName && userId && headerContainer) {
                    const muteButton = createMuteButton(userName, userId);
                    muteButton.style.marginLeft = '12px';
                    muteButton.style.verticalAlign = 'middle';
                    muteButton.style.zIndex = '100'; // コメント欄の他の要素より手前にする
                    headerContainer.appendChild(muteButton);
                }
            }
        });

        // 記事ページ（ヘッダー）へのミュートボタン追加
        const creatorInfo = document.querySelector('.o-noteContentHeader__creatorInfo, .o-noteContentHeader__nameWrapper');
        const headerAvatar = document.querySelector('a.o-noteContentHeader__avatar, a.o-noteArticleHeader__avatar');
        if (creatorInfo && headerAvatar && !creatorInfo.querySelector('.custom-muteButton')) {
            const userId = headerAvatar.getAttribute('href').replace(/^\//, "").split('?')[0];
            const nameElement = document.querySelector('.o-noteContentHeader__creatorName, .o-noteContentHeader__name');
            const userName = nameElement ? nameElement.textContent.trim() : '';

            const muteButton = createMuteButton(userName, userId);
            muteButton.style.marginLeft = '10px';
            muteButton.style.verticalAlign = 'middle';
            creatorInfo.appendChild(muteButton);
        }

        mutePosts();
    });

    // ページ全体を監視（タイムライン・記事ページ双方に対応させるため）
    const mainContainer = document.querySelector('.l-container, #__nuxt') || document.body;
    if (mainContainer) {
        observer.observe(mainContainer, { childList: true, subtree: true });
    }
}

// ミュートボタンの作成
function createMuteButton(userName, userId) {
    const muteButton = document.createElement('button');
    muteButton.classList.add("custom-muteButton");
    // ツールチップの設定
    muteButton.setAttribute('data-tooltip', 'ユーザーをミュート');
    muteButton.setAttribute('aria-label', 'ユーザーをミュート');
    // ミュートアイコンの追加
    muteButton.innerHTML = `
        <i class="bi bi-slash-circle custom-muteIcon"></i>
    `;
    // ミュートボタンのクリックイベント
    muteButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (confirm(`ユーザー「${userName}」をミュートにしますか？`)) {
            if (!authorsToMuteByName.includes(userName)) {
                authorsToMuteByName.push(userName);
            }
            if (!authorsToMuteByID.includes(userId)) {
                authorsToMuteByID.push(userId);
            }

            GM_setValue("authorsToMuteByName", authorsToMuteByName);
            GM_setValue("authorsToMuteByID", authorsToMuteByID);

            alert(`ユーザー「${userName}」の投稿をミュートしました`);
            mutePosts();
        }
    });

    return muteButton;
}

// URL変更時の監視と再適用
function monitorUrlChanges() {
    let currentUrl = location.href;

    const urlObserver = new MutationObserver(() => {
        if (currentUrl !== location.href) {
            currentUrl = location.href;
            // ページが変更されたときに再適用
            mutePosts();
            observer.disconnect();
            const mainContainer = document.querySelector('.l-container, #__nuxt') || document.body;
            if (mainContainer) {
                observer.observe(mainContainer, { childList: true, subtree: true });
            }
        }
    });

    // bodyに対してURL変更を監視
    urlObserver.observe(document.body, { childList: true, subtree: true });
}

// メニューの機能とトグル
function toggleBlurMute() {
    useBlurMute = !useBlurMute;
    GM_setValue("useBlurMute", useBlurMute);
    if (confirm("設定が更新されました。\n変更を反映するためにページをリロードしますか？")) {
        location.reload();
    }
}

// メニューの登録
GM_registerMenuCommand("ミュートリスト編集（ユーザー名）", () => manageAuthorMuteList('name'));
GM_registerMenuCommand("ミュートリスト編集（ユーザーID）", () => manageAuthorMuteList('id'));
GM_registerMenuCommand(`ぼかしミュートを使う: ${useBlurMute ? '[ON]' : '[OFF]'}`, toggleBlurMute);

// 監視の開始
monitorTimeline();
monitorUrlChanges();
