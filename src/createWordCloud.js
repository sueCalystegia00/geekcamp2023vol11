const axios = require("axios");
const fastApiUrl = "http://fastapi:8888";
const { bucket } = require("./firebase-config.js");
const { getTextByDate } = require("./database.js");
const { analysisSentiment } = require("./analysissentiment.js"); // 感情分析API
const { getAnalyzedWord } = require("./analysiswords.js"); // 形態素解析API

// const fs = require("fs");
// const { promisify } = require("util");
// const writeFile = promisify(fs.writeFile);

async function getWordCloud(userId, date) {
  //TODO:WordCloud生成の引数設定：listから文字列変換（頻度分析・感情分析・形態素解析）をどうやるかによって分かれそう
  const targetTextData = await getTextByDate(userId, date);
  // console.log(targetTextData);
  // console.log(targetTextData.length);
  const len_text = targetTextData.length; // 取得したテキストの数
  if (len_text == 0) {
    return {err: "NoText"}
  }
  const line_text = targetTextData.join(" "); // 取得したテキストを1文章に結合
  const arr_tmp = await getSentiment(line_text); // 感情分析APIに送信

  // YahooAPIで形態素解析
  words = await getAnalyzedWord(line_text)
    .then((response) => {
      return JSON.parse(response);
    })
    .catch((error) => {
      console.error(error);
    });
  words = words.result.tokens; // 形態素解析の結果

  let myDictionary = {}; // 単語の辞書

  // 品詞でフィルタリング
  for (var i = 0; i < words.length; i++) {
    if (
      words[i][3] == "名詞" ||
      words[i][3] == "動詞" ||
      words[i][3] == "形容詞"
    ) {
      // 単語が初登場なら辞書に追加
      if (myDictionary[words[i][0]] == null) {
        myDictionary[words[i][0]] = 1;
      } else {
        myDictionary[words[i][0]] += 1;
      }
    }
  }

  // FastAPIに送信するデータ
  const inputData = {
    text: JSON.stringify(myDictionary),
    sentiment: arr_tmp,
  };

  //バイナリデータをPNG変換してFirebaseStorageに保存
  const binaryData = await getBinaryData(inputData);
  //TODO:画像の保存保存場所の検討 現状はUserID.pngを更新し続けている（A：ランダム生成，B：作成後に削除，C：ファイル更新（<-現状これ)
  const fileName = userId + ".png";
  const file = bucket.file(fileName); // アップロードするファイルの名前を指定
  await file.save(binaryData, {
    contentType: "image/png", // ファイルのコンテンツタイプを指定
  });

  const url = await bucket.file(fileName).getSignedUrl({
    action: "read",
    expires: "12-31-3020", //1000年後に設定
  });

  return {result: {url}};
}

async function getBinaryData(inputData) {
  try {
    const response = await axios.post(`${fastApiUrl}/test`, inputData);
    if (response.data && typeof response.data.image === "string") {
      // Base64エンコードされた文字列をデコードしてバイナリに変換
      const binaryData = Buffer.from(response.data.image, "base64");

      // writeFile("savedImage.png", binaryData);
      // console.log("Image saved successfully");

      return binaryData;
    } else {
      console.error("Received data is not a valid Base64 encoded string");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function getSentiment(line_text) {
  const data = await analysisSentiment(line_text) // テキストを結合して感情分析APIに送信
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error(error);
    });

  arr_tmp = data.sentiment; // ポジティブ，ネガティブ，ニュートラルのいずれか

  return arr_tmp;
}

module.exports = { getWordCloud };
