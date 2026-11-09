export interface StorylineModel {
  templateId: string;
  meta: {
    title: string;
    themeColor: string;
    bgMusicUrl: string;
    bgMusicType: "synth" | "mp3";
  };
  recipient: { name: string; coverMessage: string; passcode: string };
  storyScenes: [
    { step: 1; type: "polaroid"; mediaUrl: string; caption: string; subCaption: string },
    { step: 2; type: "video_moment"; videoSource: "mp4" | "youtube"; videoUrl: string; caption: string },
    { step: 3; type: "letter"; highlightHeading: string; bodyParagraphs: string[]; signOff: string },
  ];
  /** Text displayed during the transition into each of the five scenes. */
  transitionMessages?: string[];
  finale: {
    anniversaryDate: string;
    counterEnabled: boolean;
    secretMessage: string;
    confettiStyle: "heart-petals" | "confetti";
  };
}

/** Default Storyline content copied from the supplied standalone template. */
export const defaultStorylineModel: StorylineModel = {
  templateId: "love-cinematic-letter-v1",
  meta: {
    title: "Our Little Forever",
    themeColor: "#E8A598",
    bgMusicUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
    bgMusicType: "synth",
  },
  recipient: {
    name: "ถึง คนพิเศษของฉัน",
    coverMessage: "แตะที่ตราประทับเพื่อเปิดของขวัญชิ้นพิเศษนี้...",
    passcode: "1234",
  },
  storyScenes: [
    {
      step: 1,
      type: "polaroid",
      mediaUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7",
      caption: "จำวันแรกที่เราเจอกันได้ไหม?",
      subCaption: "ทุกอย่างเริ่มต้นจากรอยยิ้มในวันนั้นแหละ",
    },
    {
      step: 2,
      type: "video_moment",
      videoSource: "mp4",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-couple-walking-on-the-beach-at-sunset-1929-large.mp4",
      caption: "รอยยิ้มและช่วงเวลานี้ที่ทำให้ทุกวันมีความหมาย ❤️",
    },
    {
      step: 3,
      type: "letter",
      highlightHeading: "ถึงความสบายใจของฉัน",
      bodyParagraphs: [
        "ขอบคุณที่เข้ามาเป็นเรื่องราวดีๆ ในทุกวันนะ",
        "ไม่ว่าวันไหนจะเหนื่อยแค่ไหน แค่ได้คุยกันก็รู้สึกมีพลังขึ้นมาเสมอ",
        "ดีใจมากๆ ที่มีเธอเดินอยู่ข้างๆ กันในทุกช่วงเวลา",
      ],
      signOff: "รักเสมอ, จากคนที่อยู่ข้างๆ เธอ",
    },
  ],
  transitionMessages: [
    "กลับไปยังจุดเริ่มต้น…",
    "เรื่องราวแรกของเรา…",
    "บางช่วงเวลาไม่เคยเลือนหาย…",
    "มีบางคำที่อยากบอกเธอ…",
    "จากวันนี้ไปจนตลอดกาล…",
  ],
  finale: {
    anniversaryDate: "2024-02-14",
    counterEnabled: true,
    secretMessage: "สัญญาว่าจะดูแลและเป็นความสุขให้กันแบบนี้ไปนานๆ เลยนะ ❤️",
    confettiStyle: "heart-petals",
  },
};
