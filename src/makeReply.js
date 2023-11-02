const { insertData, getLatestTopic,getTextByDate } = require("./database.js"); // データベース関連の関数をdatabase.jsから読み込む
const { otherOpinions } = require("./flexmessages/sample.js")

// ユーザーごとの状態を管理するオブジェクト
const userStates = {};

async function makeReply (event) {
  const userId = event.source.userId; // LINEのユーザーID
  const text = event.message.text; // ユーザーが送信したテキスト
  let mes;

  if (text === "ジャーナルスタート！") {
    // ジャーナルの支援をリクエストした場合、状態を初期化
    userStates[userId] = "start";

    // デバッグ用
    // userStates[userId] = "finish";

    // メッセージリストからランダムに1つを選択
    const initialMessages = ["将来は何になりたいですか？", "何かしてみたいことはありますか？"];
    const randomIndex = Math.floor(Math.random() * initialMessages.length);
    const responseMessages = [
      "ジャーナルの支援を開始します",
      initialMessages[randomIndex]
    ];
    // ユーザーに複数のメッセージを送信
    mes = responseMessages.map(text => ({ type: "text", text }));

  } else if (text === "一日の結果を見せて！") {
    userStates[userId] = "finish";
    // 1日分のワードクラウドを作成
    const data = await getTextByDate(userId, 1);
    console.log(data)
    mes = { type: "text", text: data[0]};
    // mes = { type: "text", text: "一日分の結果です！🥳" };

  } else if (text === "一週間の結果を見せて！") {
    userStates[userId] = "finish";
    // 7日分のワードクラウドを作成
    getTextByDate(userId, 7);
    mes = { type: "text", text: "一週間分の結果です！🥳" };

  } else if (text === "一ヶ月の結果を見せて！") {
    userStates[userId] = "finish";
    // 30日分のワードクラウドを作成
    getTextByDate(userId, 30);
    mes = { type: "text", text: "一ヶ月の結果です！🥳" };

  } else {

    if (text !== "はい" && text !== "いいえ") {
      // id, status, textをDBに格納
      insertData(userId, userStates[userId], text);
    }

    // ステータスに応じて挙動を決める
    switch (userStates[userId]) {
      case "start":
        // 最初のやり取り
        if (text === "いいえ") {
          const finishMassages = [
            "サポートはこれにて終了です！",
            "お疲れさまでした！🫠"
          ]
          mes = finishMassages.map(text => ({ type: "text", text }));
          userStates[userId] = "exception"; // statusを"exception"として設定
          console.log("exceptionに変更");
        } else {
          const initialMessages = ["もっと具体的に言うと？"];
          const randomIndex = Math.floor(Math.random() * initialMessages.length);
          mes = { type: "text", text: initialMessages[randomIndex] };
          userStates[userId] = "topic"; // statusを"topic"として設定
          console.log("topicに変更");
        }
        break;

      case "topic":
        // 2回目以降のやり取り
        const topicMessages = ["どうしてそう考えたの？🤔", "そのためにはどうすればいいかな？🤔"];
        const randomIndexTopic = Math.floor(Math.random() * topicMessages.length);
        mes = { type: "text", text: topicMessages[randomIndexTopic] };
        if (randomIndexTopic === 0) {
          userStates[userId] = "why";
          console.log("whyに変更");
        } else {
          userStates[userId] = "how";
          console.log("howに変更");
        }
        // userStates[userId].lastMessage = topicMessages[randomIndexTopic];
        break;

      case "why":
        // 3回目のやり取り 3つの質問から使ってないものを選択
        const whyMessages = ["そのためにはどうすればいいかな？🤔", "他の選択肢はある？"];
        // const remainingMessagesWhy = whyMessages.filter(message => message !== userStates[userId].lastMessage);
        // 残りのメッセージからランダムに選択
        const randomIndexWhy = Math.floor(Math.random() * whyMessages.length);
        if (randomIndexWhy === 0) {
          mes = { type: "text", text: whyMessages[randomIndexWhy] };
          userStates[userId] = "finish";
          console.log("finishに変更");
        } else {
          const latestTopic = await getLatestTopic(userId);
          console.log(latestTopic);
          mes = { type: "flex", altText: "他の選択肢について考えてみよう！😎", contents: otherOpinions(latestTopic) };
          userStates[userId] = "start";
          console.log("startに変更");
        }
        break;

      case "how":
        // 3回目のやり取り 3つの質問から使ってないものを選択
        const howMessages = ["どうしてそう考えたの？😗", "他の選択肢はある？😗"];
        // const remainingMessagesHow = howMessages.filter(message => message !== userStates[userId].lastMessage);
        // 残りのメッセージからランダムに選択
        const randomIndexHow = Math.floor(Math.random() * howMessages.length);
        if (randomIndexHow === 0) {
          mes = { type: "text", text: howMessages[randomIndexHow] };
          userStates[userId] = "finish";
          console.log("finishに変更");
        } else {
          const latestTopic = await getLatestTopic(userId);
          console.log(latestTopic);
          mes = { type: "flex", altText: "他の選択肢について考えてみよう！😎", contents: otherOpinions(latestTopic) };
          userStates[userId] = "start";
          console.log("startに変更");
        }
        break;
    
      case "finish":
        const finishMassages = [
          "サポートはこれにて終了です",
          "お疲れさまでした！🫠"
        ]
        mes = finishMassages.map(text => ({ type: "text", text }));
        // const latestTopic = await getLatestTopic(userId);
        // console.log(latestTopic);
        // mes = { type: "flex", altText: "他の選択肢について考えてみよう！😎", contents: otherOpinions(latestTopic) };
        // console.log("nullを返信");
        break;
    
      default:
        mes = null;
        userStates[userId] = "Not supported"
    }
  }

  console.log(userStates[userId])
  return mes;
}

module.exports = { makeReply };