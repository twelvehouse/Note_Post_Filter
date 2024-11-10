// ==UserScript==
// @name         Note.com Post Filter
// @namespace    https://note.com/mm____/n/n9ae64d1c9400
// @version      2.0
// @description  指定したユーザーの投稿を検索結果から非表示にします
// @author       twelvehouse
// @match        https://note.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// @downloadURL  https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// ==/UserScript==

// デフォルトの非表示ユーザーリスト
const defaultAuthorsToHide = ["エメトセルク"];
// Tampermonkeyの設定から各種設定を取得
let authorsToHide = GM_getValue("authorsToHide", defaultAuthorsToHide);
let replaceSaveButton = GM_getValue("replaceSaveButton", true); // トグルボタンのデフォルト設定

// 投稿を非表示にする関数
function hidePosts() {
    const timelineItems = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');
    timelineItems.forEach(item => {
        const authorElement = item.querySelector('.o-largeNoteSummary__userName');
        if (authorElement && authorsToHide.includes(authorElement.textContent.trim())) {
            item.style.display = 'none';
        }
    });
}

// タイムラインを監視し、非表示ボタンに置き換える
const observer = new MutationObserver(() => {
    const timelineItems = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');

    timelineItems.forEach(item => {
        const authorElement = item.querySelector('.o-largeNoteSummary__userName');
        const saveButton = item.querySelector('.o-magazineAdd button');

        if (authorElement && saveButton) {
            const userName = authorElement.textContent.trim();

            // 元の「記事に追加」ボタンを非表示にし、非表示ボタンを追加するか確認
            if (replaceSaveButton) {
                saveButton.style.display = 'none';
                const hideButton = document.createElement('button');
                hideButton.classList.add("a-icon", "a-icon--magazineAdd", "a-icon--size_mediumSmall", "custom-hideButton");

                // 非表示リストに追加ボタンのイベント
                hideButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    // 確認ダイアログを表示
                    if (confirm(`ユーザー「${userName}」を非表示にしますか？`)) {
                        // 非表示リストに追加
                        if (!authorsToHide.includes(userName)) {
                            authorsToHide.push(userName);
                            GM_setValue("authorsToHide", authorsToHide);
                            alert(`ユーザー「${userName}」の投稿を非表示にしました`);

                            // 非表示処理の実行
                            hidePosts();
                        }
                    }
                });

                // 非表示ボタンをアクションコンテナに追加
                const actionContainer = item.querySelector('.o-noteAction');
                if (actionContainer && !item.querySelector('.custom-hideButton')) {
                    actionContainer.appendChild(hideButton);
                }
            }
        }
    });

    hidePosts();
});

// タイムライン要素を監視
const timeline = document.querySelector('.t-timeline');
if (timeline) {
    observer.observe(timeline, { childList: true, subtree: true });
}

// 非表示リストの編集メニュー
GM_registerMenuCommand("非表示ユーザーを編集", editAuthorsToHide);
updateReplaceSaveButtonMenu(); // 初期表示でメニューをセット

// 非表示ユーザーを編集する関数
function editAuthorsToHide() {
    const userInput = prompt("非表示にしたいユーザー名をカンマ区切りで入力してください:", authorsToHide.join(", "));
    if (userInput !== null) {
        authorsToHide = userInput.split(",").map(name => name.trim());
        GM_setValue("authorsToHide", authorsToHide);
        // 自動リロード確認
        if (confirm("非表示ユーザーリストが更新されました。\n変更を反映するためにページをリロードしますか？")) {
            location.reload();
        }
    }
}

// 「記事に追加」ボタンを「非表示ボタン」に置き換える機能をトグルする関数
function toggleSaveButtonReplacement() {
    replaceSaveButton = !replaceSaveButton;
    GM_setValue("replaceSaveButton", replaceSaveButton);
    updateReplaceSaveButtonMenu();

    // 設定変更後のリロード確認ダイアログ
    if (confirm(`「記事に追加」ボタンを「非表示ボタン」に置き換える機能を${replaceSaveButton ? "ON" : "OFF"}にしました。\n変更を反映するためにページをリロードしますか？`)) {
        location.reload();
    }
}

// トグルボタンのメニュー表示を更新する関数
function updateReplaceSaveButtonMenu() {
    const label = `「記事に追加」ボタンを置き換える：${replaceSaveButton ? "ON" : "OFF"}`;
    GM_registerMenuCommand(label, toggleSaveButtonReplacement);
}
