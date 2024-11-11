// ==UserScript==
// @name         Note.com Post Filter
// @namespace    https://note.com/mm____/n/n9ae64d1c9400
// @version      3.2
// @description  noteの検索結果から指定したユーザーをミュートします
// @author       twelvehouse
// @match        https://note.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// @downloadURL  https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// ==/UserScript==

// ミュートリストの取得
let authorsToMuteByName = GM_getValue("authorsToMuteByName", []);
let authorsToMuteByID = GM_getValue("authorsToMuteByID", []);
// 「記事に追加」ボタンを置き換えるか？
let replaceSaveButton = GM_getValue("replaceSaveButton", true);

// ミュートリスト管理のためのMutationObserver
let observer;

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

// 「記事に追加」ボタンの置き換え機能のトグル
function toggleSaveButtonReplacement() {
    const newReplaceSaveButton = !replaceSaveButton;
    GM_setValue("replaceSaveButton", newReplaceSaveButton);
    updateReplaceSaveButtonMenu(newReplaceSaveButton);

    // 設定変更後のリロード確認ダイアログ
    if (confirm(`「記事に追加」ボタンを「ミュートボタン」に置き換える機能を${newReplaceSaveButton ? "ON" : "OFF"}にしました。\n変更を反映するためにページをリロードしますか？`)) {
        location.reload();
    }
}

// トグルボタンのメニュー表示の更新
function updateReplaceSaveButtonMenu(isReplaceOn) {
    const label = `「記事に追加」ボタンを置き換える：${isReplaceOn ? "ON" : "OFF"}`;
    GM_registerMenuCommand(label, toggleSaveButtonReplacement);
}

// タイムラインの監視と「ミュートボタン」の追加
function monitorTimeline() {
    observer = new MutationObserver(() => {
        const notePostElements = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');
        notePostElements.forEach(item => {
            const authorElement = item.querySelector('.o-largeNoteSummary__userName');
            const userLink = item.querySelector('.o-largeNoteSummary__userWrapper a');
            const saveButton = item.querySelector('.o-magazineAdd button');

            if (authorElement && userLink && saveButton) {
                const userName = authorElement.textContent.trim();
                const userId = userLink.getAttribute('href').replace(/^\//, ""); // 先頭の / を削除

                // 元の「記事に追加」ボタンを非表示にし、ミュートボタンを追加するか確認
                if (replaceSaveButton) {
                    saveButton.style.display = 'none';
                    const muteButton = createMuteButton(userName, userId);
                    const actionContainer = item.querySelector('.o-noteAction');
                    if (actionContainer && !item.querySelector('.custom-muteButton')) {
                        actionContainer.appendChild(muteButton);
                    }
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
    muteButton.classList.add("a-icon", "a-icon--magazineAdd", "a-icon--size_mediumSmall", "custom-muteButton");

    // ミュートリストに追加ボタンのイベント
    muteButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        // 確認ダイアログを表示
        if (confirm(`ユーザー「${userName}」をミュートにしますか？`)) {
            // ミュートリストにユーザー名とIDをそれぞれ追加
            if (!authorsToMuteByName.includes(userName)) {
                authorsToMuteByName.push(userName);
            }
            if (!authorsToMuteByID.includes(userId)) {
                authorsToMuteByID.push(userId);
            }

            GM_setValue("authorsToMuteByName", authorsToMuteByName);
            GM_setValue("authorsToMuteByID", authorsToMuteByID);

            alert(`ユーザー「${userName}」の投稿をミュートしました`);

            // ミュート処理の実行
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
updateReplaceSaveButtonMenu(replaceSaveButton);

// 監視の開始
monitorTimeline();
monitorUrlChanges();
