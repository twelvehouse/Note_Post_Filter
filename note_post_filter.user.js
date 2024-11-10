// ==UserScript==
// @name         Note.com Post Filter
// @namespace    https://note.com/mm____/n/n9ae64d1c9400
// @version      1.4
// @description  指定したユーザーの投稿を検索結果から非表示にします
// @author       twelvehouse
// @match        https://note.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// @downloadURL  https://github.com/twelvehouse/Note_Post_Filter/raw/main/note_post_filter.user.js
// ==/UserScript==

// デフォルトの非表示ユーザー名リスト
const defaultAuthorsToHide = ["エメトセルク"];

// ユーザー設定から非表示リストを取得またはデフォルト設定を適用
let authorsToHide = GM_getValue("authorsToHide", defaultAuthorsToHide);

// 検索結果を監視
const observer = new MutationObserver(() => {
    const timelineItems = document.querySelectorAll('.m-timelineItemWrapper__itemWrapper');
    timelineItems.forEach(item => {
        const authorElement = item.querySelector('.o-largeNoteSummary__userName');
        if (authorElement && authorsToHide.includes(authorElement.textContent.trim())) {
            item.style.display = 'none';
        }
    });
});

// 監視対象の要素を設定
observer.observe(document.querySelector('.t-timeline'), { childList: true, subtree: true });

// 設定変更用のメニューを登録
GM_registerMenuCommand("非表示ユーザーを編集", editAuthorsToHide);

// 非表示ユーザーリストの編集
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