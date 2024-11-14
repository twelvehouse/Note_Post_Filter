// ==UserScript==
// @name         Note.com Post Filter
// @namespace    https://note.com/mm____/n/n9ae64d1c9400
// @version      3.3
// @description  noteの検索結果から指定したユーザーをミュートします
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
`);

// ノート投稿をミュートにする
function mutePosts() {
    const notePostElements = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');
    notePostElements.forEach(item => {
        const authorElement = item.querySelector('.o-largeNoteSummary__userName');
        const userLink = item.querySelector('.o-largeNoteSummary__userWrapper a');

        if (authorElement && userLink) {
            const userName = authorElement.textContent.trim();
            const userId = userLink.getAttribute('href').replace(/^\//, ""); // 先頭の / を削除

            // ミュートリストにユーザー名またはIDが一致する場合
            if (authorsToMuteByName.includes(userName) || authorsToMuteByID.includes(userId)) {
                item.style.display = 'none';
            }
        }
    });
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

// タイムラインの監視と「ミュートボタン」の追加
function monitorTimeline() {
    observer = new MutationObserver(() => {
        const notePostElements = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');
        notePostElements.forEach(item => {
            const authorElement = item.querySelector('.o-largeNoteSummary__userName');
            const userLink = item.querySelector('.o-largeNoteSummary__userWrapper a');
            const saveButton = item.querySelector('.o-magazineAdd button');

            if (authorElement && userLink) {
                const userName = authorElement.textContent.trim();
                const userId = userLink.getAttribute('href').replace(/^\//, ""); // 先頭の / を削除

                // ミュートボタンを追加
                const muteButton = createMuteButton(userName, userId);
                const actionContainer = item.querySelector('.o-noteAction');

                if (actionContainer && !item.querySelector('.custom-muteButton')) {
                    actionContainer.appendChild(muteButton); // ミュートボタンを追加
                }
            }
        });

        mutePosts();
    });

    // タイムライン要素を監視
    const timeline = document.querySelector('.t-timeline');
    if (timeline) {
        observer.observe(timeline, { childList: true, subtree: true });
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
            const timeline = document.querySelector('.t-timeline');
            if (timeline) {
                observer.observe(timeline, { childList: true, subtree: true });
            }
        }
    });

    // bodyに対してURL変更を監視
    urlObserver.observe(document.body, { childList: true, subtree: true });
}

// メニューの登録
GM_registerMenuCommand("ミュートリスト編集（ユーザー名）", () => manageAuthorMuteList('name'));
GM_registerMenuCommand("ミュートリスト編集（ユーザーID）", () => manageAuthorMuteList('id'));

// 監視の開始
monitorTimeline();
monitorUrlChanges();
