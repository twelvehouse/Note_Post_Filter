// ==UserScript==
// @name         Note.com Post Filter
// @namespace    https://note.com/mm____/n/n9ae64d1c9400
// @version      3.1
// @description  noteの検索結果から指定したユーザーをミュートします
// @author       twelvehouse
// @match        https://note.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// @downloadURL  https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// ==/UserScript==

// ミュートリスト
let authorsToMuteByName = GM_getValue("authorsToMuteByName", []);
let authorsToMuteByID = GM_getValue("authorsToMuteByID", []);
// 「記事に追加」ボタンを置き換えるか？
let replaceSaveButton = GM_getValue("replaceSaveButton", true); // トグルボタンのデフォルト設定

// 投稿をミュートにする関数
function mutePosts() {
    const timelineItems = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');
    timelineItems.forEach(item => {
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

// タイムラインを監視し、ミュートボタンに置き換える
const observer = new MutationObserver(() => {
    const timelineItems = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');

    timelineItems.forEach(item => {
        const authorElement = item.querySelector('.o-largeNoteSummary__userName');
        const userLink = item.querySelector('.o-largeNoteSummary__userWrapper a');
        const saveButton = item.querySelector('.o-magazineAdd button');

        if (authorElement && userLink && saveButton) {
            const userName = authorElement.textContent.trim();
            const userId = userLink.getAttribute('href').replace(/^\//, ""); // 先頭の / を削除

            // 元の「記事に追加」ボタンを非表示にし、ミュートボタンを追加するか確認
            if (replaceSaveButton) {
                saveButton.style.display = 'none';
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

                // ミュートボタンをアクションコンテナに追加
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

// ミュートリストの編集メニュー（ユーザー名のみ）
GM_registerMenuCommand("ミュートリスト編集（ユーザー名）", editAuthorsToMuteByName);

// ミュートリストの編集メニュー（ユーザーIDのみ）
GM_registerMenuCommand("ミュートリスト編集（ユーザーID）", editAuthorsToMuteByID);

updateReplaceSaveButtonMenu(); // 初期表示でメニューをセット

// ミュートユーザー名を編集する関数
function editAuthorsToMuteByName() {
    const userInput = prompt(
        "ミュートにしたいユーザー名をカンマ区切りで入力してください:", 
        authorsToMuteByName.length > 0 ? authorsToMuteByName.join(", ") : ""
    );
    if (userInput !== null) {
        authorsToMuteByName = userInput.split(",").map(name => name.trim());
        GM_setValue("authorsToMuteByName", authorsToMuteByName);
        if (confirm("ミュートリストが更新されました。\n変更を反映するためにページをリロードしますか？")) {
            location.reload();
        }
    }
}

// ミュートユーザーIDを編集する関数
function editAuthorsToMuteByID() {
    const userInput = prompt(
        "ミュートにしたいユーザーIDをカンマ区切りで入力してください:",
        authorsToMuteByID.length > 0 ? authorsToMuteByID.join(", ") : ""
    );
    if (userInput !== null) {
        authorsToMuteByID = userInput.split(",").map(id => id.trim());
        GM_setValue("authorsToMuteByID", authorsToMuteByID);
        if (confirm("ミュートリストが更新されました。\n変更を反映するためにページをリロードしますか？")) {
            location.reload();
        }
    }
}

// 「記事に追加」ボタンを「ミュートボタン」に置き換える機能をトグルする関数
function toggleSaveButtonReplacement() {
    replaceSaveButton = !replaceSaveButton;
    GM_setValue("replaceSaveButton", replaceSaveButton);
    updateReplaceSaveButtonMenu();

    // 設定変更後のリロード確認ダイアログ
    if (confirm(`「記事に追加」ボタンを「ミュートボタン」に置き換える機能を${replaceSaveButton ? "ON" : "OFF"}にしました。\n変更を反映するためにページをリロードしますか？`)) {
        location.reload();
    }
}

// トグルボタンのメニュー表示を更新する関数
function updateReplaceSaveButtonMenu() {
    const label = `「記事に追加」ボタンを置き換える：${replaceSaveButton ? "ON" : "OFF"}`;
    GM_registerMenuCommand(label, toggleSaveButtonReplacement);
}
