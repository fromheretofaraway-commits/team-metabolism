// data.js — チーム・メタボリズム ゲームデータ
// 生成日時: 2026-03-16
// ソース: csv/*.csv から自動変換

const DATA = {

  // ========================================
  // 01_職種カード.csv
  // ========================================
  professions: [
    {
      id: "R01",
      name: "内科医（糖尿病専門医）",
      flavor: "患者は医者に会いたい。チームは方針を求めている。時間は有限だ。",
      passive1: "",
      skillName: "チームの船頭",
      skillEffect: "結束度8以上のときのみ使用可能。患者ケースカードを1枚解決する。自身のバーンアウトを+1する",
      burnoutThreshold: 5, burnoutMax: 8, initialBurnout: 0
    },
    {
      id: "R02",
      name: "看護師（糖尿病認定看護師）",
      flavor: "私は患者を一番よく知っている。でも方針を決めるのは医師だ——そのはずだ。",
      passive1: "",
      skillName: "白衣の戦士",
      skillEffect: "自身のバーンアウトを+4して、放置ペナルティを1減らす",
      burnoutThreshold: 5, burnoutMax: 8, initialBurnout: 2
    },
    {
      id: "R03",
      name: "管理栄養士",
      flavor: "食事は薬だと言いたい。でも患者は聞いてくれるだろうか。チームは私の仕事を理解してくれるだろうか。",
      passive1: "",
      skillName: "栄養カンファレンス",
      skillEffect: "チーム全員のバーンアウト-2（結束度8以上限定）",
      burnoutThreshold: 5, burnoutMax: 8, initialBurnout: 0
    },
    {
      id: "R04",
      name: "薬剤師",
      flavor: "処方の意図を理解するのが私の仕事だ。でも医師は私に相談せずに処方する。",
      passive1: "",
      skillName: "処方監査",
      skillEffect: "アクションカード3枚引き2枚選択（1枚捨て札）",
      burnoutThreshold: 5, burnoutMax: 8, initialBurnout: 0
    },
    {
      id: "R05",
      name: "理学療法士",
      flavor: "運動は最高の薬だ。でも糖尿病チームでの私の位置づけはまだ曖昧なままだ。",
      passive1: "",
      skillName: "みんなで筋トレ",
      skillEffect: "自身のアクションを2回分消費。全プレーヤーのバーンアウト-1、結束度+1",
      burnoutThreshold: 5, burnoutMax: 8, initialBurnout: 0
    },
    {
      id: "R06",
      name: "臨床心理士",
      flavor: "患者の心のケアはチームの誰かがやらなければいけない。でもこのチーム自体もケアが必要に見える。",
      passive1: "",
      skillName: "1 on 1",
      skillEffect: "自分以外のプレーヤーを選択し、バーンアウト-3。自身のバーンアウト+1",
      burnoutThreshold: 5, burnoutMax: 8, initialBurnout: 2
    },
    {
      id: "R07",
      name: "医療ソーシャルワーカー（MSW）（選択不可）",
      flavor: "患者の生活を支えるのが私の仕事だ。",
      passive1: "",
      skillName: "", skillEffect: "",
      burnoutThreshold: 5, burnoutMax: 8, initialBurnout: 0
    },
    {
      id: "R08",
      name: "医事課スタッフ（事務職）（選択不可）",
      flavor: "レセプトが通らなければチームは成立しない。",
      passive1: "",
      skillName: "", skillEffect: "",
      burnoutThreshold: 5, burnoutMax: 8, initialBurnout: 0
    }
  ],

  // ========================================
  // 02_患者ケースカード.csv
  // ========================================
  patientCases: [
    {
      // --- 通常（合計コスト4） --- 15枚
      id: "001", title: "先生、はじめまして！（糖尿病での初回受診）", category: "血糖管理",
      tags: ["薬物療法", "教育"],
      requiredActions: { 診察: 2, エデュケーション: 1, ソーシャル: 1 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "003", title: "毎朝、薬だけでお腹いっぱいですよ（ポリファーマシーの高齢者）", category: "血糖管理",
      tags: ["薬物療法", "社会的背景"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 2 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "006", title: "好きなものを食べて、生きて行きたいんです（食事療法の遵守が難しい人）", category: "生活習慣介入",
      tags: ["生活習慣介入", "教育"],
      requiredActions: { 診察: 1, エデュケーション: 2, ソーシャル: 1 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "007", title: "運動？　時間がなくて…（運動習慣のない肥満の人）", category: "生活習慣介入",
      tags: ["生活習慣介入", "運動療法"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 2 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "008", title: "毎晩コンビニ弁当なんです（職場ストレスで食生活崩壊）", category: "生活習慣介入",
      tags: ["生活習慣介入", "社会的背景", "アドヒアランス"],
      requiredActions: { 診察: 1, エデュケーション: 2, ソーシャル: 1 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "009", title: "タバコだけはやめられないんです（禁煙指導が必要な人）", category: "生活習慣介入",
      tags: ["生活習慣介入", "教育"],
      requiredActions: { 診察: 1, エデュケーション: 2, ソーシャル: 1 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "011", title: "腎臓が悪いなんて言われたことないけど？（糖尿病性腎症・初期）", category: "合併症管理",
      tags: ["薬物療法", "教育"],
      requiredActions: { 診察: 2, エデュケーション: 1, ソーシャル: 1 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "013", title: "痛くも痒くもないけど？（糖尿病性神経障害・初期）", category: "合併症管理",
      tags: ["薬物療法", "精神的支援"],
      requiredActions: { 診察: 2, エデュケーション: 1, ソーシャル: 1 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "031", title: "眼科ですか？かかったことないですね（糖尿病網膜症・初期）", category: "合併症管理",
      tags: ["薬物療法", "教育"],
      requiredActions: { 診察: 2, エデュケーション: 1, ソーシャル: 1 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "021", title: "説明が多すぎて頭が真っ白です（新規診断・情報過多）", category: "教育・アドヒアランス",
      tags: ["教育", "アドヒアランス"],
      requiredActions: { 診察: 1, エデュケーション: 3, ソーシャル: 0 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "022", title: "指に針を刺すのが怖いんです（自己血糖測定の拒否）", category: "教育・アドヒアランス",
      tags: ["アドヒアランス", "精神的支援"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 2 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "023", title: "足なんて別に大丈夫ですよ（フットケアを渋る人）", category: "教育・アドヒアランス",
      tags: ["教育"],
      requiredActions: { 診察: 0, エデュケーション: 2, ソーシャル: 2 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "024", title: "ノート？　書くの忘れちゃって…（自己管理ノートが続かない人）", category: "教育・アドヒアランス",
      tags: ["アドヒアランス", "教育"],
      requiredActions: { 診察: 2, エデュケーション: 2, ソーシャル: 0 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      id: "025", title: "他の患者さんと話すのはちょっと…（患者会への参加を拒む人）", category: "教育・アドヒアランス",
      tags: ["アドヒアランス", "社会的背景"],
      requiredActions: { 診察: 0, エデュケーション: 1, ソーシャル: 3 },
      rewardVP: 1, rewardOther: "", alert: "通常"
    },
    {
      // --- 要注意（合計コスト3） --- 11枚
      id: "004", title: "注射だけは勘弁してください（インスリン導入困難）", category: "血糖管理",
      tags: ["薬物療法", "教育", "アドヒアランス"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 1 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "005", title: "打たなくても調子いいから大丈夫（インスリン自己中断）", category: "血糖管理",
      tags: ["アドヒアランス", "精神的支援"],
      requiredActions: { 診察: 0, エデュケーション: 1, ソーシャル: 2 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "010", title: "家族には頼れないです（家族のサポートが得られない人）", category: "生活習慣介入",
      tags: ["生活習慣介入", "社会的背景"],
      requiredActions: { 診察: 1, エデュケーション: 0, ソーシャル: 2 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "016", title: "高い薬はやめてください（経済的困窮）", category: "社会的背景",
      tags: ["社会的背景", "薬物療法"],
      requiredActions: { 診察: 0, エデュケーション: 1, ソーシャル: 2 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "017", title: "この人の薬は私が管理しています（老老介護）", category: "社会的背景",
      tags: ["社会的背景", "教育"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 1 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "018", title: "ニホンゴ、ムズカシイデス…（外国籍の方・言語バリア）", category: "社会的背景",
      tags: ["社会的背景", "アドヒアランス"],
      requiredActions: { 診察: 1, エデュケーション: 2, ソーシャル: 0 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "020", title: "自分の家には帰れないんですか？（施設入所調整）", category: "社会的背景",
      tags: ["社会的背景", "薬物療法"],
      requiredActions: { 診察: 2, エデュケーション: 0, ソーシャル: 1 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "026", title: "来週手術なんです（手術前の血糖マネジメント）", category: "要警戒・複合対応",
      tags: ["緊急", "薬物療法"],
      requiredActions: { 診察: 2, エデュケーション: 1, ソーシャル: 0 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "028", title: "先生によって言うこと違うんですけど？（多職種カンファが必要なケース）", category: "要警戒・複合対応",
      tags: ["全タグ"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 1 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "029", title: "言われた通りに飲んでいるはずなんだけどね（残薬多数）", category: "要警戒・複合対応",
      tags: ["薬物療法", "アドヒアランス"],
      requiredActions: { 診察: 2, エデュケーション: 1, ソーシャル: 0 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "030", title: "今年も検査の季節ですね（定期的な合併症評価）", category: "要警戒・複合対応",
      tags: ["全タグ"],
      requiredActions: { 診察: 0, エデュケーション: 1, ソーシャル: 2 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      id: "019", title: "孫がいないと何もできなくて（ヤングケアラー依存）", category: "社会的背景",
      tags: ["社会的背景", "精神的支援"],
      requiredActions: { 診察: 0, エデュケーション: 0, ソーシャル: 3 },
      rewardVP: 2, rewardOther: "", alert: "要注意"
    },
    {
      // --- 要警戒（合計コスト2） --- 7枚
      id: "002", title: "また低血糖で倒れました（繰り返す低血糖）", category: "血糖管理",
      tags: ["薬物療法", "緊急"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 0 },
      rewardVP: 3, rewardOther: "", alert: "要警戒"
    },
    {
      id: "012", title: "足の傷が治らないんです（糖尿病性神経障害・進行）", category: "合併症管理",
      tags: ["緊急", "教育"],
      requiredActions: { 診察: 1, エデュケーション: 0, ソーシャル: 1 },
      rewardVP: 3, rewardOther: "", alert: "要警戒"
    },
    {
      id: "014", title: "最近、目がかすむんです（糖尿病性網膜症・進行）", category: "合併症管理",
      tags: ["緊急", "薬物療法"],
      requiredActions: { 診察: 2, エデュケーション: 0, ソーシャル: 0 },
      rewardVP: 3, rewardOther: "", alert: "要警戒"
    },
    {
      id: "015", title: "心臓も悪いって言われまして（心疾患も合併したケース）", category: "合併症管理",
      tags: ["薬物療法", "緊急"],
      requiredActions: { 診察: 0, エデュケーション: 1, ソーシャル: 1 },
      rewardVP: 3, rewardOther: "", alert: "要警戒"
    },
    {
      id: "032", title: "毎回、尿たんぱくが多いっていわれて（糖尿病性腎症・進行）", category: "合併症管理",
      tags: ["薬物療法", "緊急"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 0 },
      rewardVP: 3, rewardOther: "", alert: "要警戒"
    },
    {
      id: "027", title: "気づいたら救急車でした（異常な高血糖）", category: "要警戒・複合対応",
      tags: ["緊急", "教育", "薬物療法"],
      requiredActions: { 診察: 1, エデュケーション: 1, ソーシャル: 0 },
      rewardVP: 3, rewardOther: "", alert: "要警戒"
    }
  ],

  // ========================================
  // 03_通常イベントカード.csv
  // ========================================
  normalEvents: [
    {
      id: "E02", title: "申し送りの記録が不完全", category: "コミュニケーション",
      effect: "全プレイヤーは、手札1枚を選んで捨てる",
      autoProcess: false
    },
    {
      id: "E05", title: "医師が指示を出さずに帰宅", category: "コミュニケーション",
      effect: "内科医は、このフェーズで1アクションしか行動できない",
      autoProcess: true
    },
    {
      id: "E06", title: "非公式ランチMTGが生産的だった", category: "コミュニケーション",
      effect: "結束度+1。全プレイヤーがアクションカードを1枚引く",
      autoProcess: true
    },
    {
      id: "E08", title: "週次ミーティングが形骸化", category: "コミュニケーション",
      effect: "結束度を-1する。加えて、全プレーヤーは根回しカードを1枚捨てる",
      autoProcess: true
    },
    {
      id: "E10", title: "人気職種が他部署に引き抜かれそう", category: "人材・組織",
      effect: "リーダーが根回しカード3枚を捨てる。所持数が2枚以下の場合には、リーダー以外のプレーヤーを指名し、バーンアウト+3",
      autoProcess: false
    },
    {
      id: "E11", title: "研修医のローテーション", category: "人材・組織",
      effect: "結束度+1される。加えて患者カードが1枚追加される（放置ペナルティーが生じる場合には、その効果も発動させる）",
      autoProcess: true
    },
    {
      id: "E14", title: "管理職への昇進オファー", category: "人材・組織",
      effect: "リーダーがオファーを受け入れるか選択。受け入れる場合、リーダーのVPが+3され、このターンからアクションが-1される",
      autoProcess: false
    },
    {
      id: "E16", title: "チームの評判が院内に広まる", category: "人材・組織",
      effect: "病院長の評価+1。加えて、今ある放置ペナルティーを1つ減らす",
      autoProcess: true
    },
    {
      id: "E17", title: "予算会議で発言権を得た", category: "院内政治",
      effect: "根回しカード2枚を全員に配布",
      autoProcess: true
    },
    {
      id: "E18", title: "他科との縄張り争い", category: "院内政治",
      effect: "結束度6以上→このターンのみ全プレーヤーとも3回目のアクション実行でバーンアウト上昇なし、結束度5以下→このターンのみ全プレーヤーのアクション回数-1",
      autoProcess: true
    },
    {
      id: "E19", title: "病院長が視察に来た", category: "院内政治",
      effect: "結束度8以上→病院長の評価+2、結束度3以下→病院長の評価-2、それ以外→効果なし",
      autoProcess: false
    },
    {
      id: "E20", title: "医療安全委員会からの指摘", category: "院内政治",
      effect: "病院長の評価6以上→全プレーヤーが1枚ずつ山札からカードを引く、病院長の評価5以下→全プレーヤーが1枚ずつ任意のアクションカードを捨てる",
      autoProcess: true
    }
  ],

  // ========================================
  // 04_危機カード.csv
  // ========================================
  crisisCards: [
    {
      id: "C01", title: "◯◯さん、これもよろしく",
      flavor: "また仕事が増えた。断れない空気がある。",
      immediateEffect: "リーダーが指名したプレイヤーのバーンアウト値+3"
    },
    {
      id: "C04", title: "慢性的な人手不足",
      flavor: "誰もが限界だった。それでもケアは止められない。",
      immediateEffect: "全プレイヤーのバーンアウト値+2"
    },
    {
      id: "C05", title: "院内政治の暴走",
      flavor: "上の決定に反論できなかった。チームの意見は届かなかった。",
      immediateEffect: "全員の根回しカードを消費して病院長の評価+2、もしくは病院長の評価-4"
    },
    {
      id: "C06", title: "燃え尽き症候群",
      flavor: "もう何もする気力が残っていない。",
      immediateEffect: "リーダーの左隣のプレイヤーは、このターン行動できない"
    }
  ],

  // ========================================
  // 05_アクションカード.csv
  // ========================================
  actionCards: [
    // --- 診察 ---
    { id: "A01", title: "外来診察", type: "診察", provides: { 診察: 1 }, flavor: "15分の枠で何をどこまで確認できるか。それが問われる。", extra: "" },
    { id: "A02", title: "入院管理", type: "診察", provides: { 診察: 1 }, flavor: "病棟のベッドは語る。患者の24時間がここにある。", extra: "" },
    { id: "A03", title: "専門外来設定", type: "診察", provides: { 診察: 1 }, flavor: "糖尿病専門外来の枠が増えた。チームへの信頼の証だ。", extra: "" },
    { id: "A04", title: "他科コンサルト", type: "診察", provides: { 診察: 1 }, flavor: "どの科に頼むか。それも経験と人脈が必要な判断だ。", extra: "" },
    { id: "A05", title: "カンファレンス提示", type: "診察", provides: { 診察: 1 }, flavor: "難しいケースを皆で見る。それがチームの強さになる。", extra: "" },
    { id: "A06", title: "初診問診の徹底", type: "診察", provides: { 診察: 1 }, flavor: "最初の30分がその後の治療方針を決めることがある。", extra: "" },
    { id: "A07", title: "治療方針の再評価", type: "診察", provides: { 診察: 1 }, flavor: "うまくいかないとき立ち止まって見直す勇気がいる。", extra: "" },
    { id: "A08", title: "緊急対応", type: "診察", provides: { 診察: 1 }, flavor: "コールがかかったのは深夜だった。でも行かなければならない。", extra: "" },
    { id: "A09", title: "定期フォロー", type: "診察", provides: { 診察: 1 }, flavor: "変化のない外来こそ実は最も重要なことがある。", extra: "" },
    { id: "A10", title: "診療録の整備", type: "診察", provides: { 診察: 1 }, flavor: "記録はチームへのメッセージだ。次の人のために書く。", extra: "" },
    { id: "A61", title: "検査オーダーの最適化", type: "診察", provides: { 診察: 1 }, flavor: "必要な検査を必要なタイミングで。それが診断の質を決める。", extra: "" },
    { id: "A62", title: "セカンドオピニオン対応", type: "診察", provides: { 診察: 1 }, flavor: "患者が別の意見を求めることは信頼の欠如ではない。", extra: "" },
    { id: "A63", title: "退院時サマリー作成", type: "診察", provides: { 診察: 1 }, flavor: "次の医療者への最も重要な手紙を書く。", extra: "" },
    { id: "A64", title: "合併症スクリーニング", type: "診察", provides: { 診察: 1 }, flavor: "見つけたくないものを探す。それが予防医療の本質だ。", extra: "" },
    { id: "A65", title: "多職種回診", type: "診察", provides: { 診察: 1 }, flavor: "ベッドサイドで全員が同じ患者を見る。視点の数だけ気づきがある。", extra: "" },
    { id: "A66", title: "夜間オンコール対応", type: "診察", provides: { 診察: 1 }, flavor: "夜中の電話に出る。それもチーム医療の一部だ。", extra: "" },

    // --- エデュケーション ---
    { id: "A11", title: "自己血糖測定指導", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "数字を見せても伝わらない。意味を理解してもらうことが本物の教育だ。", extra: "" },
    { id: "A12", title: "低血糖教育", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "低血糖は患者が一番怖いものだ。その恐怖を丁寧に解きほぐす。", extra: "" },
    { id: "A13", title: "インスリン注射指導", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "最初は誰もが怖がる。その壁を越えると患者の表情が変わる。", extra: "" },
    { id: "A14", title: "フットケア教育", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "靴ずれが壊疽になる。それを知っているのは私たちだけだ。", extra: "" },
    { id: "A16", title: "教育入院プログラム", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "1週間の入院がその後10年の自己管理を変えることがある。", extra: "" },
    { id: "A17", title: "集団指導セッション", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "同じ悩みを持つ患者が集まると言葉の力が変わる。", extra: "" },
    { id: "A18", title: "家族への説明", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "患者を一人で支えようとするから孤立する。家族を巻き込む。", extra: "" },
    { id: "A21", title: "処方見直し", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "多剤になるほど誰かが全体を見なければいけない。", extra: "" },
    { id: "A22", title: "薬剤情報提供", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "患者は薬の名前を知っているが何のために飲むかは知らない。", extra: "" },
    { id: "A23", title: "副作用モニタリング", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "副作用が出るのは悪いことではない。見逃すのが問題だ。", extra: "" },
    { id: "A25", title: "残薬確認", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "薬箱の中がアドヒアランスの真実を教えてくれる。", extra: "" },
    { id: "A26", title: "後発品への切り替え", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "経済的な理由で薬をやめる患者がいる。それを防ぐのも医療だ。", extra: "" },
    { id: "A27", title: "注射薬の管理指導", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "インスリンの保存方法を間違えている患者は少なくない。", extra: "" },
    { id: "A30", title: "薬剤経済性の評価", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "患者が継続できる処方が最善の処方だ。", extra: "" },
    { id: "A31", title: "食事評価", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "3日間の食事記録からその人の生活が見える。", extra: "" },
    { id: "A32", title: "個別栄養指導", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "ガイドラインの食事とその人が食べられる食事は違う。", extra: "" },
    { id: "A34", title: "体組成評価", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "体重だけでは見えないものがある。体の中を知る。", extra: "" },
    { id: "A35", title: "調理実習プログラム", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "知っていることとできることの間に壁がある。", extra: "" },
    { id: "A37", title: "間欠的断食の評価", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "患者が試したいと言ってきた。まず話を聞くことから始める。", extra: "" },
    { id: "A39", title: "睡眠指導", type: "エデュケーション", provides: { エデュケーション: 1 }, flavor: "睡眠と血糖の関係を知っている患者は少ない。知ることが変化を生む。", extra: "" },

    // --- ソーシャル ---
    { id: "A41", title: "社会資源の調査", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "知らないサービスは使えない。でも私たちは知らなければいけない。", extra: "" },
    { id: "A42", title: "介護保険申請支援", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "申請のタイミングを逃すと支援が届くのが遅れる。", extra: "" },
    { id: "A43", title: "退院支援カンファレンス", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "退院後の生活を退院前に設計する。", extra: "" },
    { id: "A44", title: "家族面談", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "家族に巻き込まれると支援の質が変わる。", extra: "" },
    { id: "A45", title: "他機関との連携", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "病院の外にもこの患者を支えているチームがある。", extra: "" },
    { id: "A46", title: "経済的支援制度の活用", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "利用できる制度があっても知らなければ使えない。", extra: "" },
    { id: "A48", title: "患者会への橋渡し", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "同じ経験を持つ人の言葉は専門家の説明より届くことがある。", extra: "" },
    { id: "A33", title: "リハビリテーション計画", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "エビデンスがある運動でも続かなければ意味がない。その人に合った処方を考える。", extra: "" },
    { id: "A36", title: "運動療法セッション", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "まず10分から。完璧を目指さないことが継続の秘訣だ。", extra: "" },
    { id: "A38", title: "グループセラピー", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "仲間と一緒に取り組むことで孤独な療養が変わることがある。", extra: "" },
    { id: "A49", title: "専門チームへの紹介", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "どの科に相談すべきか。タイミングを逃さない判断が求められる。", extra: "" },
    { id: "A53", title: "心理アセスメント", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "患者の訴えの裏にある不安を見抜く。それが治療の入り口になる。", extra: "" },
    { id: "A54", title: "認知行動療法の導入", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "考え方の癖に気づくことが行動変容の第一歩になる。", extra: "" },
    { id: "A55", title: "疼痛管理プログラム", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "痛みは主観だ。でも管理できる。そのための専門知識がある。", extra: "" },
    { id: "A56", title: "心理カウンセリング", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "大丈夫？と聞いただけで人は少し楽になることがある。", extra: "" },
    { id: "A58", title: "作業療法評価", type: "ソーシャル", provides: { ソーシャル: 1 }, flavor: "日常生活の動作を一つずつ確認する。できることを増やす支援だ。", extra: "" },

    // --- マネジメント ---
    { id: "A51", title: "非公式の懇親会", type: "マネジメント", provides: {}, flavor: "業務外で話すとなぜか仕事が少しやりやすくなる。", extra: "根回しカード×1を任意プレイヤーへ＋結束度+2" },
    { id: "A52", title: "1on1面談の実施", type: "マネジメント", provides: {}, flavor: "誰かの本音を聞く時間を作った。それだけで関係が変わった。", extra: "任意プレイヤーのバーンアウト-1＋自分に根回しカード×1＋病院長の評価+1" },
{ id: "A60", title: "緊急チームミーティング", type: "マネジメント", provides: {}, flavor: "今すぐ全員を集める必要がある。", extra: "1ゲーム1回限定。全員手札+2＋作戦タイム3分＋病院長の評価+1" },

    // --- MSW由来マネジメントカード ---
    { id: "M-MSW1", title: "ソーシャルワーク介入", type: "マネジメント", provides: {},
      flavor: "患者の生活を支えるのが私の仕事だ。",
      extra: "任意の患者ケースのソーシャル必要数を2減らす＋結束度+1" },
    { id: "M-MSW2", title: "ステークホルダー橋渡し", type: "マネジメント", provides: {},
      flavor: "院内の力学を誰よりも理解している。",
      extra: "病院長の評価+2＋根回しカード×1を全員に配布" },

    // --- 医事課由来マネジメントカード ---
    { id: "M-JIMU1", title: "診療報酬最適化", type: "マネジメント", provides: {},
      flavor: "レセプトが通らなければチームは成立しない。",
      extra: "ターン消費なし。好きな枚数のカードを捨てて山札から同数補充" },
    { id: "M-JIMU2", title: "事務力によるチーム支援", type: "マネジメント", provides: {},
      flavor: "誰も気づかないが、この人がいないと回らない。",
      extra: "全プレイヤーに根回しカード×1配布＋全プレイヤーの手札+2枚" },

    // --- メディカルDX ---
    { id: "M-DX", title: "メディカルDX", type: "マネジメント", provides: {},
      flavor: "テクノロジーがチーム医療を加速させる。",
      extra: "病院長の評価+1＋指定したアクションカード2枚の効果を即座に発現（マネジメント不可）" },

    // --- 管理栄養士専用カード ---
    { id: "N01", title: "栄養アセスメント", type: "診察", provides: { 診察: 1 },
      flavor: "数字だけでは見えない。食べることの背景を読み解く。", extra: "" },
    { id: "N02", title: "食事カウンセリング", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "患者の話を聞くことが、最も効果的な栄養指導だ。", extra: "" },
    { id: "N03", title: "糖質コントロール指導", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "制限ではなく選択。それが長続きする食事療法の秘訣。", extra: "" },
    { id: "N04", title: "外来栄養指導", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "月に一度の20分が、日々の食卓を変える。", extra: "" },
    { id: "N05", title: "身体計測と栄養スクリーニング", type: "診察", provides: { 診察: 1 },
      flavor: "BMIだけでは足りない。握力、下腿周囲長、すべてが栄養状態を語る。", extra: "" },
    { id: "N06", title: "地域食文化への配慮", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "郷土料理を否定しても始まらない。その中で折り合いをつける。", extra: "" },
    { id: "N07", title: "買い物・調理環境の確認", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "冷蔵庫の中身を聞けば、その人の食生活が見える。", extra: "" },
    { id: "N08", title: "多職種への栄養情報共有", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "食事のことは栄養士に聞いて。でも、まず私が伝えなければ。", extra: "" },

    // --- 薬剤師専用カード ---
    { id: "P01", title: "処方提案", type: "診察", provides: { 診察: 1 },
      flavor: "医師への提案が患者の治療を変えることがある。", extra: "" },
    { id: "P02", title: "薬物相互作用チェック", type: "診察", provides: { 診察: 1 },
      flavor: "一つひとつの薬は安全でも、組み合わせが危険を生む。", extra: "" },
    { id: "P03", title: "服薬指導", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "薬の飲み方ひとつで効果が変わる。それを伝えるのが私の仕事。", extra: "" },
    { id: "P04", title: "TDMモニタリング", type: "診察", provides: { 診察: 1 },
      flavor: "血中濃度を測る。適切な量を、適切なタイミングで。", extra: "" },
    { id: "P05", title: "インスリンデバイス指導", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "デバイスの進化についていく。患者のQOLのために。", extra: "" },
    { id: "P06", title: "在宅訪問薬剤管理", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "薬局の外に出て初めて見える服薬の現実がある。", extra: "" },
    { id: "P07", title: "お薬手帳の活用推進", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "一冊の手帳がチームの情報共有を支える。", extra: "" },
    { id: "P08", title: "薬薬連携（病院-薬局）", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "退院後も薬のフォローは続く。地域の薬局との連携が鍵だ。", extra: "" },

    // --- 理学療法士専用カード ---
    { id: "PT01", title: "運動処方", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "その人に合った運動を処方する。薬と同じくらい大切な仕事。", extra: "" },
    { id: "PT02", title: "転倒予防プログラム", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "転ばないことが、自立を守る第一歩だ。", extra: "" },
    { id: "PT03", title: "心肺機能評価", type: "診察", provides: { 診察: 1 },
      flavor: "運動の前にまず体を知る。安全な運動のために。", extra: "" },
    { id: "PT04", title: "ADL訓練", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "日常の動作を取り戻すこと。それが患者の尊厳だ。", extra: "" },
    { id: "PT05", title: "在宅運動指導", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "病院の外でも続けられる運動を一緒に考える。", extra: "" },
    { id: "PT06", title: "フレイル予防", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "衰えは突然来るように見えて、実は緩やかに進む。", extra: "" },
    { id: "PT07", title: "糖尿病運動教室", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "仲間と一緒に動く。それだけで運動は楽しくなる。", extra: "" },
    { id: "PT08", title: "歩行評価", type: "診察", provides: { 診察: 1 },
      flavor: "歩き方を見れば、体のどこに問題があるかわかる。", extra: "" },
    { id: "PT09", title: "運動負荷試験", type: "診察", provides: { 診察: 1 },
      flavor: "どこまで負荷をかけられるか。安全の境界を見極める。", extra: "" },
    { id: "PT10", title: "生活動線の評価", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "家の中をどう動いているか。それが運動プランの出発点だ。", extra: "" },

    // --- 臨床心理士専用カード ---
    { id: "CP01", title: "動機づけ面接", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "変わりたいと思っている。でもまだ怖い。その気持ちを受け止める。", extra: "" },
    { id: "CP02", title: "ストレスマネジメント", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "ストレスをなくすのではなく、付き合い方を見つける。", extra: "" },
    { id: "CP03", title: "アドヒアランス支援", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "なぜ続けられないのか。理由がわかれば道が見える。", extra: "" },
    { id: "CP04", title: "うつ病スクリーニング", type: "診察", provides: { 診察: 1 },
      flavor: "糖尿病の影にうつが隠れている。見逃してはいけない。", extra: "" },
    { id: "CP05", title: "心理教育プログラム", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "知ることで不安が減る。心理教育はその入り口だ。", extra: "" },
    { id: "CP06", title: "リラクゼーション指導", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "体の力を抜くことが、心の力を抜くことにつながる。", extra: "" },
    { id: "CP07", title: "自己効力感強化", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "できると思えたとき、人は変わり始める。", extra: "" },
    { id: "CP08", title: "心理検査の実施", type: "診察", provides: { 診察: 1 },
      flavor: "客観的な指標が、見えない苦しみを可視化する。", extra: "" },
    { id: "CP09", title: "糖尿病ディストレス評価", type: "診察", provides: { 診察: 1 },
      flavor: "糖尿病であること自体がストレスだ。その重さを測る。", extra: "" },
    { id: "CP10", title: "家族心理支援", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "患者だけでなく、支える家族にもケアが必要だ。", extra: "" },
    { id: "CP11", title: "セルフモニタリング指導", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "自分の気持ちを記録する。それが変化への第一歩になる。", extra: "" },

    // --- 内科医追加カード ---
    { id: "DR01", title: "患者への病状説明", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "専門用語を使わずに伝える。それが最も難しい技術だ。", extra: "" },
    { id: "DR02", title: "治療目標の共有", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "目標は医師が決めるものではない。患者と一緒に作るものだ。", extra: "" },
    { id: "DR03", title: "地域医療連携", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "かかりつけ医との連携が、患者の日常を支える。", extra: "" },
    { id: "DR04", title: "紹介状の作成", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "適切な紹介が患者の運命を変えることがある。", extra: "" },

    // --- 看護師追加カード ---
    { id: "NS01", title: "バイタルサイン評価", type: "診察", provides: { 診察: 1 },
      flavor: "数字の変化に最初に気づくのは、いつもベッドサイドにいる私たちだ。", extra: "" },
    { id: "NS02", title: "療養指導", type: "エデュケーション", provides: { エデュケーション: 1 },
      flavor: "退院後の生活を想像しながら、今できることを一緒に考える。", extra: "" },
    { id: "NS03", title: "訪問看護との連携", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "病院を出た後も、看護は続く。", extra: "" },
    { id: "NS04", title: "患者の代弁", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "患者が医師に言えないことを、私が代わりに伝える。", extra: "" },
    { id: "NS05", title: "多職種への情報共有", type: "ソーシャル", provides: { ソーシャル: 1 },
      flavor: "24時間そばにいるからこそ見える変化を、チームに届ける。", extra: "" },
    { id: "NS06", title: "夜間の観察記録", type: "診察", provides: { 診察: 1 },
      flavor: "夜中に起きていることが、昼間の治療方針を変える。", extra: "" }
  ],

  // ========================================
  // 06_秘密ミッションカード.csv
  // ========================================
  secretMissions: [
    // チームワーク系
    { id: "M03", title: "バーンアウト防止士", category: "チームワーク",
      condition: "ゲーム終了時、自分以外の全プレイヤーのバーンアウトが3以下", vp: 5 },

    // 個人職種系
    // M05「専門性の証明」はM21「エゴイスト」と統合（条件重複のため削除）
    { id: "M07", title: "バーンアウトゼロ", category: "個人職種",
      condition: "ゲーム終了時、自分のバーンアウトが0", vp: 5 },
    { id: "M21", title: "エゴイスト", category: "個人職種",
      condition: "ゲーム終了時、自分が取得した投票カードの枚数がチーム内で最多（解決した患者ケースが最も多かった）", vp: 5 },

    // 政治・交渉系
    { id: "M09", title: "院内政治の達人", category: "政治・交渉",
      condition: "ゲーム終了時、自分の根回しカード残数がチーム内で最少（最も多く消費した）", vp: 5 },
    { id: "M10", title: "ステークホルダー外交", category: "政治・交渉",
      condition: "ゲーム終了時、病院長の評価が5以上ならVP+3、8以上ならVP+5", vp: 0, vpTiered: { 5: 3, 8: 5 } },
    { id: "M18", title: "病院長の密偵", category: "政治・交渉",
      condition: "ゲーム終了時、病院長の評価が8以上かつ、自分以外の全プレイヤーのバーンアウトが自分より高い", vp: 8 },

    // ジレンマ系
    { id: "M19", title: "燃え尽きたエース", category: "ジレンマ",
      condition: "ゲーム終了時、自分のバーンアウトがチーム内で最高かつ、投票カードもチーム内で最多（最も働き最も消耗した）", vp: 8 },
    { id: "M20", title: "沈黙の貢献者", category: "ジレンマ",
      condition: "ゲーム終了時、自分の投票カードがチーム内で最少（解決は他人に任せた）かつ、根回しカード残数もチーム内で最少（裏方に徹した）", vp: 8 }
  ],

  // ========================================
  // 07_ステークホルダータイル.csv
  // ========================================
  stakeholder: {
    id: "S01",
    name: "病院長",
    effects: {
      10: { desc: "絶大な信頼", effect: "毎ラウンド全員に根回しカード+2、患者解決で投票カード+1" },
      9: { desc: "全面支持", effect: "毎ラウンド全員に根回しカード+1、患者解決で投票カード+1" },
      8: { desc: "強い支持", effect: "毎ラウンド全員に根回しカード+1" },
      7: { desc: "好意的", effect: "毎ラウンドアクションカード+1枚（チーム共有ドロー）" },
      6: { desc: "やや好意的", effect: "効果なし" },
      5: { desc: "中立", effect: "効果なし" },
      4: { desc: "やや不満", effect: "効果なし" },
      3: { desc: "不満", effect: "毎ラウンドスロット7の患者を強制的に放置ペナルティゾーンへ押し出す" },
      2: { desc: "敵対的", effect: "毎ラウンドランダム1名バーンアウト+1" },
      1: { desc: "敵対", effect: "毎ラウンドランダム1名バーンアウト+1、結束度-1" },
      0: { desc: "完全敵対", effect: "即時敗北" }
    },
    autoChange: "放置マーカー合計3個以上でラウンド終了時-1。同一ラウンドで患者2枚以上解決時+1。危機カード発動時-1"
  }
};

// ========================================
// 職種別デッキ定義
// ========================================

// 共通マネジメントカードID
DATA._commonManagementIds = ["A51", "A52", "A60", "M-MSW1", "M-MSW2", "M-JIMU1", "M-JIMU2", "M-DX"];

// 職種別固有カードID
DATA._professionCardIds = {
  // R01 内科医: 診察7, エデュケーション5, ソーシャル4 = 16枚
  R01: [
    // 診察(7): 専門外来・問診・治療方針など医師の中核業務
    "A01","A03","A05","A06","A07","A61","A64",
    // エデュケーション(5): 病状説明・副作用・処方見直しなど
    "A23","A21","A18","DR01","DR02",
    // ソーシャル(4): 他科連携・地域連携・退院支援
    "A43","A49","DR03","DR04"
  ],
  // R02 看護師: 診察4, エデュケーション5, ソーシャル6 = 15枚
  R02: [
    // 診察(4): バイタル・観察・フォロー・緊急対応
    "A08","A09","NS01","NS06",
    // エデュケーション(5): 注射指導・低血糖教育・療養指導など
    "A11","A12","A13","A14","NS02",
    // ソーシャル(6): 退院支援・訪問看護連携・患者代弁・情報共有
    "A43","A44","A48","NS03","NS04","NS05"
  ],
  // R03 管理栄養士: 診察4, エデュケーション7, ソーシャル4 = 15枚
  R03: [
    // 診察(4): 栄養アセスメント・身体計測・合併症スクリーニング・定期フォロー
    "N01","N05","A64","A09",
    // エデュケーション(7): 食事カウンセリング・糖質指導・栄養指導・個別栄養・調理実習・間欠断食・睡眠
    "N02","N03","N04","A32","A35","A37","A39",
    // ソーシャル(4): 地域食文化・買い物環境・多職種共有・グループセラピー
    "N06","N07","N08","A38"
  ],
  // R04 薬剤師: 診察5, エデュケーション5, ソーシャル5 = 15枚
  R04: [
    // 診察(5): 処方提案・相互作用・TDM・検査オーダー最適化・セカンドオピニオン
    "P01","P02","P04","A61","A62",
    // エデュケーション(5): 服薬指導・デバイス指導・低血糖教育・副作用モニタリング・薬剤経済性
    "P03","P05","A12","A23","A30",
    // ソーシャル(5): 在宅訪問・お薬手帳・薬薬連携・患者会・他機関連携
    "P06","P07","P08","A48","A45"
  ],
  // R05 理学療法士: 診察4, エデュケーション5, ソーシャル6 = 15枚
  R05: [
    // 診察(4): 心肺機能評価・歩行評価・運動負荷試験・合併症スクリーニング
    "PT03","PT08","PT09","A64",
    // エデュケーション(5): 運動処方・在宅運動指導・フレイル予防・睡眠指導・集団指導
    "PT01","PT05","PT06","A39","A17",
    // ソーシャル(6): 転倒予防・ADL訓練・運動教室・リハビリ計画・生活動線・グループ
    "PT02","PT04","PT07","A33","PT10","A38"
  ],
  // R06 臨床心理士: 診察4, エデュケーション5, ソーシャル6 = 15枚
  R06: [
    // 診察(4): うつスクリーニング・心理検査・ディストレス評価・定期フォロー
    "CP04","CP08","CP09","A09",
    // エデュケーション(5): 動機づけ面接・ストレスマネジメント・アドヒアランス・心理教育・セルフモニタリング
    "CP01","CP02","CP03","CP05","CP11",
    // ソーシャル(6): リラクゼーション・自己効力感・家族心理・心理アセスメント・認知行動療法・グループセラピー
    "CP06","CP07","CP10","A53","A54","A38"
  ]
};

// カードIDからカードオブジェクトを検索するヘルパー
DATA._cardById = {};
(function() {
  for (const card of DATA.actionCards) {
    DATA._cardById[card.id] = card;
  }
})();

/**
 * 職種別デッキを構築する。
 * 固有カードをB版で倍増 + 共通マネジメントカード8枚。
 * @param {string} professionId - 職種ID
 * @returns {Array} カードオブジェクトの配列
 */
DATA.buildProfessionDeck = function(professionId) {
  const cardIds = DATA._professionCardIds[professionId];
  if (!cardIds) return [];

  const deck = [];

  // 固有カード（原本 + B版）のみ。マネジメントカードは別途配布。
  for (const id of cardIds) {
    const card = DATA._cardById[id];
    if (card) {
      deck.push({ ...card });
      deck.push({ ...card, id: card.id + 'B' });
    }
  }

  return deck;
};

/**
 * マネジメントカードのデッキを構築する（全枚数シャッフル済み）
 * @returns {Array} シャッフルされたマネジメントカード配列
 */
DATA.buildManagementDeck = function() {
  const deck = [];
  for (const id of DATA._commonManagementIds) {
    const card = DATA._cardById[id];
    if (card) {
      deck.push({ ...card });
    }
  }
  // シャッフル
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};
