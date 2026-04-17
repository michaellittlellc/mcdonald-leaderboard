import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  doc, setDoc, onSnapshot, collection, addDoc,
  query, orderBy, limit, serverTimestamp
} from "firebase/firestore";

const DEFAULT_PASSWORD  = "Password123!";
const MANAGER_PASSWORD  = "Mcdonald123!";
const PRIZE_RESTRICTED_IDS = [10, 9, 12, 8];
const POINT_VALUES = { transfer:1, sold_transfer:1, closed_transfer:2, own_sale:3 };

const ADMIN_MANAGERS = [
  { id:"mgr-tee",     name:"Tee Adams",      role:"Manager", isAdminManager:true },
  { id:"mgr-michael", name:"Michael Little", role:"Manager", isAdminManager:true },
  { id:"mgr-tyler",   name:"Tyler McDonald", role:"Manager", isAdminManager:true },
];

const AGENTS_DEFAULT = [
  { id:1,  name:"Destiny Humphreys", role:"Agent" },
  { id:2,  name:"Hailie Veal",       role:"Agent" },
  { id:3,  name:"Kaitlin Sinclair",  role:"Agent" },
  { id:4,  name:"Edith Spradley",    role:"Agent" },
  { id:5,  name:"Layla Finch",       role:"Agent" },
  { id:6,  name:"Abbie Sanders",     role:"Agent" },
  { id:7,  name:"Beth",              role:"Agent" },
  { id:8,  name:"Christian Kanupke", role:"Agent" },
  { id:9,  name:"Austin Oblow",      role:"Agent" },
  { id:10, name:"Chipper Wiley",     role:"Agent" },
  { id:11, name:"Madison Crowley",   role:"Manager" },
  { id:12, name:"Dana Gordy",        role:"Agent" },
];

const TROPHY_COLORS = {
  dark: {
    0: { cup:"#f59e0b", shine:"#fde68a", shadow:"#b45309", glow:"#f59e0b55", label:"GOLD",   border:"#f59e0b66", bg:"linear-gradient(135deg,#1c1500,#0f172a)" },
    1: { cup:"#cbd5e1", shine:"#f1f5f9", shadow:"#64748b", glow:"#94a3b855", label:"SILVER", border:"#94a3b855", bg:"linear-gradient(135deg,#0f1520,#0f172a)" },
    2: { cup:"#c2773a", shine:"#f0a968", shadow:"#7c4a1e", glow:"#c2773a55", label:"BRONZE", border:"#c2773a55", bg:"linear-gradient(135deg,#180e05,#0f172a)" },
  },
  light: {
    0: { cup:"#b45309", shine:"#92400e", shadow:"#78350f", glow:"#f59e0b44", label:"GOLD",   border:"#f59e0b99", bg:"linear-gradient(135deg,#fef9c3,#fef3c7)" },
    1: { cup:"#475569", shine:"#1e293b", shadow:"#334155", glow:"#94a3b844", label:"SILVER", border:"#94a3b899", bg:"linear-gradient(135deg,#f1f5f9,#e2e8f0)" },
    2: { cup:"#7c4a1e", shine:"#92400e", shadow:"#6b3a16", glow:"#c2773a44", label:"BRONZE", border:"#c2773a99", bg:"linear-gradient(135deg,#fde8d0,#fddbb4)" },
  },
};

const TV_THEMES = {
  midnight: {
    label:"🌙 Midnight", animated:false,
    bg:"#0a0f1e", card:"#0f172a", border:"#1e3a5f", text:"#f1f5f9", muted:"#64748b", accent:"#60a5fa",
    top3:[
      { cup:"#f59e0b", shine:"#fde68a", shadow:"#b45309", glow:"#f59e0b55", label:"GOLD",   border:"#f59e0b66", bg:"linear-gradient(135deg,#1c1500,#0f172a)" },
      { cup:"#cbd5e1", shine:"#f1f5f9", shadow:"#64748b", glow:"#94a3b855", label:"SILVER", border:"#94a3b855", bg:"linear-gradient(135deg,#0f1520,#0f172a)" },
      { cup:"#c2773a", shine:"#f0a968", shadow:"#7c4a1e", glow:"#c2773a55", label:"BRONZE", border:"#c2773a55", bg:"linear-gradient(135deg,#180e05,#0f172a)" },
    ],
  },
  inferno: {
    label:"🔥 Inferno", animated:true,
    animBg:"linear-gradient(270deg,#0d0000,#450a00,#7c1d00,#b45309,#7c1d00,#450a00,#0d0000)",
    animStyle:"@keyframes tvAnim{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}",
    bg:"#0d0000", card:"#1a0500", border:"#7c2d12", text:"#fef3c7", muted:"#fb923c", accent:"#f97316",
    top3:[
      { cup:"#ef4444", shine:"#fca5a5", shadow:"#991b1b", glow:"#ef444455", label:"CRIMSON", border:"#ef444466", bg:"linear-gradient(135deg,#1c0000,#0d0000)" },
      { cup:"#fb923c", shine:"#fed7aa", shadow:"#c2410c", glow:"#fb923c55", label:"EMBER",   border:"#fb923c66", bg:"linear-gradient(135deg,#1a0800,#0d0000)" },
      { cup:"#78716c", shine:"#d6d3d1", shadow:"#44403c", glow:"#78716c55", label:"ASH",     border:"#78716c66", bg:"linear-gradient(135deg,#1c1917,#0d0000)" },
    ],
  },
  galaxy: {
    label:"🌌 Galaxy", animated:true,
    animBg:"linear-gradient(270deg,#030010,#0d0040,#1e0060,#4c1d95,#1e0060,#0d0040,#030010)",
    animStyle:"@keyframes tvAnim{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}",
    bg:"#030010", card:"#0a0020", border:"#6d28d9", text:"#ede9fe", muted:"#a78bfa", accent:"#8b5cf6",
    top3:[
      { cup:"#a855f7", shine:"#e9d5ff", shadow:"#6b21a8", glow:"#a855f755", label:"COSMIC",   border:"#a855f766", bg:"linear-gradient(135deg,#1a0040,#030010)" },
      { cup:"#818cf8", shine:"#c7d2fe", shadow:"#4338ca", glow:"#818cf855", label:"NEBULA",   border:"#818cf866", bg:"linear-gradient(135deg,#0f1060,#030010)" },
      { cup:"#6ee7b7", shine:"#d1fae5", shadow:"#047857", glow:"#6ee7b755", label:"STARDUST", border:"#6ee7b766", bg:"linear-gradient(135deg,#001a10,#030010)" },
    ],
  },
  gameday: {
    label:"🏈 Game Day", animated:false,
    bg:"#0a0e1a", card:"#0f1729", border:"#1e3a6e", text:"#f1f5f9", muted:"#94a3b8", accent:"#3b82f6",
    top3:[
      { cup:"#1d4ed8", shine:"#93c5fd", shadow:"#1e3a8a", glow:"#1d4ed855", label:"NAVY",  border:"#1d4ed866", bg:"linear-gradient(135deg,#0a0e1a,#1e3a8a33)" },
      { cup:"#dc2626", shine:"#fca5a5", shadow:"#991b1b", glow:"#dc262655", label:"RED",   border:"#dc262666", bg:"linear-gradient(135deg,#0a0e1a,#7f1d1d33)" },
      { cup:"#e2e8f0", shine:"#ffffff", shadow:"#94a3b8", glow:"#e2e8f055", label:"WHITE", border:"#e2e8f066", bg:"linear-gradient(135deg,#0a0e1a,#33415533)" },
    ],
  },
  ice: {
    label:"❄️ Ice", animated:false,
    bg:"#000d1a", card:"#001a33", border:"#0ea5e9", text:"#e0f2fe", muted:"#7dd3fc", accent:"#38bdf8",
    top3:[
      { cup:"#e0f2fe", shine:"#ffffff", shadow:"#0369a1", glow:"#e0f2fe55", label:"DIAMOND", border:"#e0f2fe66", bg:"linear-gradient(135deg,#001a33,#000d1a)" },
      { cup:"#7dd3fc", shine:"#bae6fd", shadow:"#0284c7", glow:"#7dd3fc55", label:"FROST",   border:"#7dd3fc66", bg:"linear-gradient(135deg,#001020,#000d1a)" },
      { cup:"#38bdf8", shine:"#7dd3fc", shadow:"#0369a1", glow:"#38bdf855", label:"GLACIER", border:"#38bdf866", bg:"linear-gradient(135deg,#000d20,#000d1a)" },
    ],
  },
};

const BIBLE_VERSES = [
  { ref:"John 3:16",        text:"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { ref:"Jeremiah 29:11",   text:"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { ref:"Philippians 4:13", text:"I can do all this through him who gives me strength." },
  { ref:"Romans 8:28",      text:"And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { ref:"Proverbs 3:5-6",   text:"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { ref:"Isaiah 40:31",     text:"But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { ref:"Psalm 23:1",       text:"The Lord is my shepherd, I lack nothing." },
  { ref:"Matthew 6:33",     text:"But seek first his kingdom and his righteousness, and all these things will be given to you as well." },
  { ref:"Joshua 1:9",       text:"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." },
  { ref:"Psalm 46:1",       text:"God is our refuge and strength, an ever-present help in trouble." },
  { ref:"Romans 12:2",      text:"Do not conform to the pattern of this world, but be transformed by the renewing of your mind." },
  { ref:"2 Timothy 1:7",    text:"For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline." },
  { ref:"Matthew 5:16",     text:"Let your light shine before others, that they may see your good deeds and glorify your Father in heaven." },
  { ref:"Psalm 119:105",    text:"Your word is a lamp for my feet, a light on my path." },
  { ref:"Proverbs 16:3",    text:"Commit to the Lord whatever you do, and he will establish your plans." },
  { ref:"Galatians 6:9",    text:"Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up." },
  { ref:"Isaiah 41:10",     text:"So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you." },
  { ref:"Psalm 27:1",       text:"The Lord is my light and my salvation — whom shall I fear? The Lord is the stronghold of my life — of whom shall I be afraid?" },
  { ref:"Matthew 11:28",    text:"Come to me, all you who are weary and burdened, and I will give you rest." },
  { ref:"Romans 15:13",     text:"May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit." },
  { ref:"Ephesians 2:8-9",  text:"For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God — not by works, so that no one can boast." },
  { ref:"1 Corinthians 13:4-5", text:"Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking." },
  { ref:"Psalm 37:4",       text:"Take delight in the Lord, and he will give you the desires of your heart." },
  { ref:"Proverbs 22:6",    text:"Start children off on the way they should go, and even when they are old they will not turn from it." },
  { ref:"Philippians 4:6-7",text:"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God." },
  { ref:"1 John 4:19",      text:"We love because he first loved us." },
  { ref:"James 1:2-3",      text:"Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance." },
  { ref:"Hebrews 11:1",     text:"Now faith is confidence in what we hope for and assurance about what we do not see." },
  { ref:"Psalm 91:1-2",     text:"Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, He is my refuge and my fortress, my God, in whom I trust." },
  { ref:"John 14:6",        text:"Jesus answered, I am the way and the truth and the life. No one comes to the Father except through me." },
  { ref:"Romans 6:23",      text:"For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord." },
  { ref:"Psalm 139:14",     text:"I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well." },
  { ref:"Matthew 28:19-20", text:"Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit." },
  { ref:"John 16:33",       text:"I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world." },
  { ref:"Proverbs 31:25",   text:"She is clothed with strength and dignity; she can laugh at the days to come." },
  { ref:"Lamentations 3:22-23", text:"Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness." },
  { ref:"Romans 8:38-39",   text:"For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, can separate us from the love of God." },
  { ref:"Ephesians 3:20",   text:"Now to him who is able to do immeasurably more than all we ask or imagine, according to his power that is at work within us." },
  { ref:"John 15:13",       text:"Greater love has no one than this: to lay down one's life for one's friends." },
  { ref:"Psalm 34:18",      text:"The Lord is close to the brokenhearted and saves those who are crushed in spirit." },
  { ref:"Colossians 3:23",  text:"Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
  { ref:"Micah 6:8",        text:"He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God." },
  { ref:"Isaiah 43:2",      text:"When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you." },
  { ref:"Deuteronomy 31:8", text:"The Lord himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged." },
  { ref:"Romans 5:8",       text:"But God demonstrates his own love for us in this: While we were still sinners, Christ died for us." },
  { ref:"Psalm 32:8",       text:"I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you." },
  { ref:"John 10:10",       text:"The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full." },
  { ref:"1 Peter 5:7",      text:"Cast all your anxiety on him because he cares for you." },
  { ref:"Proverbs 4:23",    text:"Above all else, guard your heart, for everything you do flows from it." },
  { ref:"Matthew 5:9",      text:"Blessed are the peacemakers, for they will be called children of God." },
  { ref:"Psalm 23:4",       text:"Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me." },
  { ref:"Ephesians 6:10",   text:"Finally, be strong in the Lord and in his mighty power." },
  { ref:"1 Chronicles 16:34",text:"Give thanks to the Lord, for he is good; his love endures forever." },
  { ref:"Matthew 7:7",      text:"Ask and it will be given to you; seek and you will find; knock and the door will be opened to you." },
  { ref:"Philippians 4:4",  text:"Rejoice in the Lord always. I will say it again: Rejoice!" },
  { ref:"Isaiah 55:8-9",    text:"For my thoughts are not your thoughts, neither are your ways my ways, declares the Lord." },
  { ref:"Hebrews 12:1",     text:"Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles." },
  { ref:"Genesis 1:1",      text:"In the beginning God created the heavens and the earth." },
  { ref:"John 1:1",         text:"In the beginning was the Word, and the Word was with God, and the Word was God." },
  { ref:"Psalm 100:4",      text:"Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name." },
  { ref:"Romans 10:9",      text:"If you declare with your mouth, Jesus is Lord, and believe in your heart that God raised him from the dead, you will be saved." },
  { ref:"Mark 12:30",       text:"Love the Lord your God with all your heart and with all your soul and with all your mind and with all your strength." },
  { ref:"1 Corinthians 10:13",text:"No temptation has overtaken you except what is common to mankind. And God is faithful." },
  { ref:"Revelation 21:4",  text:"He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain." },
  { ref:"Psalm 16:8",       text:"I keep my eyes always on the Lord. With him at my right hand, I will not be shaken." },
  { ref:"Proverbs 18:10",   text:"The name of the Lord is a fortified tower; the righteous run to it and are safe." },
  { ref:"Colossians 3:15",  text:"Let the peace of Christ rule in your hearts, since as members of one body you were called to peace. And be thankful." },
  { ref:"Zephaniah 3:17",   text:"The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing." },
  { ref:"2 Corinthians 5:17",text:"Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!" },
  { ref:"Psalm 46:10",      text:"Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." },
  { ref:"John 8:32",        text:"Then you will know the truth, and the truth will set you free." },
  { ref:"Matthew 5:6",      text:"Blessed are those who hunger and thirst for righteousness, for they will be filled." },
  { ref:"Romans 12:12",     text:"Be joyful in hope, patient in affliction, faithful in prayer." },
  { ref:"Psalm 145:18",     text:"The Lord is near to all who call on him, to all who call on him in truth." },
  { ref:"Hebrews 4:16",     text:"Let us then approach God's throne of grace with confidence, so that we may receive mercy and find grace to help us in our time of need." },
  { ref:"Proverbs 27:17",   text:"As iron sharpens iron, so one person sharpens another." },
  { ref:"Isaiah 26:3",      text:"You will keep in perfect peace those whose minds are steadfast, because they trust in you." },
  { ref:"Ephesians 4:32",   text:"Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you." },
  { ref:"John 14:27",       text:"Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid." },
  { ref:"1 John 1:9",       text:"If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness." },
  { ref:"Psalm 55:22",      text:"Cast your cares on the Lord and he will sustain you; he will never let the righteous be shaken." },
  { ref:"Matthew 5:44",     text:"But I tell you, love your enemies and pray for those who persecute you." },
  { ref:"2 Corinthians 12:9",text:"But he said to me, My grace is sufficient for you, for my power is made perfect in weakness." },
  { ref:"Proverbs 3:9-10",  text:"Honor the Lord with your wealth, with the firstfruits of all your crops; then your barns will be filled to overflowing." },
  { ref:"Psalm 28:7",       text:"The Lord is my strength and my shield; my heart trusts in him, and he helps me." },
  { ref:"Philippians 1:6",  text:"Being confident of this, that he who began a good work in you will carry it on to completion until the day of Christ Jesus." },
  { ref:"Isaiah 40:29",     text:"He gives strength to the weary and increases the power of the weak." },
  { ref:"James 4:7",        text:"Submit yourselves, then, to God. Resist the devil, and he will flee from you." },
  { ref:"Psalm 121:1-2",    text:"I lift up my eyes to the mountains — where does my help come from? My help comes from the Lord, the Maker of heaven and earth." },
  { ref:"Acts 1:8",         text:"But you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth." },
  { ref:"Luke 1:37",        text:"For no word from God will ever fail." },
  { ref:"1 Thessalonians 5:16-18", text:"Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus." },
  { ref:"Proverbs 11:14",   text:"For lack of guidance a nation falls, but victory is won through many advisers." },
  { ref:"Psalm 19:14",      text:"May these words of my mouth and this meditation of my heart be pleasing in your sight, Lord, my Rock and my Redeemer." },
  { ref:"John 3:30",        text:"He must become greater; I must become less." },
  { ref:"Matthew 22:37-39", text:"Love the Lord your God with all your heart and with all your soul and with all your mind. This is the first and greatest commandment. And the second is like it: Love your neighbor as yourself." },
  { ref:"Romans 1:16",      text:"For I am not ashamed of the gospel, because it is the power of God that brings salvation to everyone who believes." },
  { ref:"Psalm 51:10",      text:"Create in me a pure heart, O God, and renew a steadfast spirit within me." },
  { ref:"Proverbs 29:18",   text:"Where there is no revelation, people cast off restraint; but blessed is the one who heeds wisdom's instruction." },
];

// Get a consistent verse for the current week (changes every Monday)
const getWeeklyVerse = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
  return BIBLE_VERSES[weekNum % BIBLE_VERSES.length];
};
  { id:"first_sale",    label:"First Sale",   icon:"[*]", condition:(s,pts,tdp) => s.own_sale >= 1 },
  { id:"ten_transfers", label:"10 Transfers", icon:"[~]", condition:(s,pts,tdp) => s.transfer >= 10 },
  { id:"hat_trick",     label:"Hat Trick",    icon:"[^]", condition:(s,pts,tdp) => s.own_sale >= 3 },
  { id:"closer",        label:"Closer",       icon:"[+]", condition:(s,pts,tdp) => (s.sold_transfer+s.closed_transfer) >= 5 },
  { id:"mvp",           label:"25 Points",    icon:"[$]", condition:(s,pts,tdp) => pts >= 25 },
  { id:"on_fire",       label:"On Fire",      icon:"[!]", condition:(s,pts,tdp) => pts >= 15 || tdp >= 6 },
];

const calcPoints = s => s.transfer*1 + s.sold_transfer*1 + s.closed_transfer*2 + s.own_sale*3;
const calcApps   = s => s.sold_transfer + s.closed_transfer + s.own_sale;
const initStats  = () => ({ transfer:0, sold_transfer:0, closed_transfer:0, own_sale:0 });

const DARK  = { bg:"#0a0f1e", text:"#f1f5f9", muted:"#64748b", cardBg:"#0f172a", border:"#1e3a5f", headerBg:"#0a0f1e", bannerBg:"#0f172a" };
const LIGHT = { bg:"#f1f5f9", text:"#0f172a", muted:"#64748b", cardBg:"#ffffff", border:"#cbd5e1", headerBg:"#ffffff", bannerBg:"#f8fafc" };

// ── Trophy ────────────────────────────────────────────────────
function Trophy({ rank, size=48, colors }) {
  const c = colors || TROPHY_COLORS.dark[rank];
  if (!c) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id={`glow${rank}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.shine} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={c.cup} stopOpacity="0.6"/>
        </radialGradient>
      </defs>
      <rect x="14" y="40" width="20" height="3" rx="1.5" fill={c.shadow}/>
      <rect x="20" y="34" width="8" height="7" rx="1" fill={c.cup}/>
      <path d="M10 16 Q6 16 6 22 Q6 28 12 28" stroke={c.cup} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M38 16 Q42 16 42 22 Q42 28 36 28" stroke={c.cup} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M12 10 L36 10 L32 30 Q28 34 24 34 Q20 34 16 30 Z" fill={`url(#glow${rank})`}/>
      <path d="M16 13 Q18 11 22 12" stroke={c.shine} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7"/>
      <text x="24" y="25" textAnchor="middle" fontSize="10" fill={c.shadow} fontWeight="bold">★</text>
    </svg>
  );
}

// ── Confetti ──────────────────────────────────────────────────
function Confetti({ active, tvTheme }) {
  const colors = ["#f59e0b","#60a5fa","#34d399","#f472b6","#a78bfa","#fb923c"];
  const isGalaxy = tvTheme === "galaxy";
  if (!active) return null;

  if (isGalaxy) {
    return (
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
        {/* Stars */}
        {Array.from({length:60}).map((_,i) => {
          const left=Math.random()*100, delay=Math.random()*2, dur=1.5+Math.random()*2;
          const sz=4+Math.random()*8, colors=["#e9d5ff","#818cf8","#6ee7b7","#fbbf24","#ffffff"];
          const color=colors[i%colors.length];
          return (
            <div key={i} style={{position:"absolute",left:`${left}%`,top:"-20px",fontSize:sz+8,animation:`starFall ${dur}s ${delay}s linear forwards`}}>⭐</div>
          );
        })}
        {/* Rockets */}
        {Array.from({length:8}).map((_,i) => {
          const left=5+Math.random()*90, delay=Math.random()*3, dur=2+Math.random()*2;
          return (
            <div key={`r${i}`} style={{position:"absolute",left:`${left}%`,bottom:"-60px",fontSize:28+Math.random()*20,animation:`rocketLaunch ${dur}s ${delay}s ease-in forwards`}}>🚀</div>
          );
        })}
        <style>{`
          @keyframes starFall{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(110vh) rotate(360deg) scale(0.5);opacity:0}}
          @keyframes rocketLaunch{0%{transform:translateY(0) rotate(-45deg);opacity:1}100%{transform:translateY(-110vh) rotate(-45deg);opacity:0}}
        `}</style>
      </div>
    );
  }

  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
      {Array.from({length:80}).map((_,i) => {
        const left=Math.random()*100, delay=Math.random()*2, dur=2+Math.random()*2;
        const color=colors[i%colors.length], sz=6+Math.random()*10;
        return <div key={i} style={{position:"absolute",left:`${left}%`,top:"-20px",width:sz,height:sz,background:color,borderRadius:Math.random()>0.5?"50%":"2px",animation:`fall ${dur}s ${delay}s linear forwards`}}/>;
      })}
      <style>{`@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

// ── Celebration Banner ────────────────────────────────────────
function CelebrationBanner({ celebration }) {
  if (!celebration) return null;
  const msg = celebration.type==="own_sale" ? "🏆 OWN SALE!" : celebration.type==="sold_transfer" ? "✅ SENT & CLOSED!" : "🎖️ BADGE EARNED!";
  return (
    <div style={{position:"fixed",inset:0,zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
      <div style={{textAlign:"center",animation:"celebIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards"}}>
        <div style={{fontSize:"clamp(18px,4vw,48px)",fontWeight:900,color:"#fbbf24",letterSpacing:4,marginBottom:12,textShadow:"0 0 40px #f59e0b,0 0 80px #f59e0b88",fontFamily:"'Trebuchet MS',sans-serif",textTransform:"uppercase"}}>
          {msg}
        </div>
        <div style={{fontSize:"clamp(32px,8vw,96px)",fontWeight:900,color:"#ffffff",letterSpacing:2,textShadow:"0 0 60px #60a5fa,0 0 120px #3b82f688",fontFamily:"'Trebuchet MS',sans-serif",lineHeight:1.1}}>
          {celebration.name}
        </div>
        <div style={{fontSize:"clamp(14px,2.5vw,28px)",color:"#94a3b8",marginTop:10,letterSpacing:3,fontFamily:"'Trebuchet MS',sans-serif"}}>
          McDONALD GROUP
        </div>
      </div>
      <style>{`@keyframes celebIn{0%{transform:scale(0.5) translateY(40px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}`}</style>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────
function LoginScreen({ agents, onLogin }) {
  const all = [...ADMIN_MANAGERS, ...agents].sort((a,b)=>a.name.localeCompare(b.name));
  const [selId,setSelId] = useState("");
  const [pw,setPw]       = useState("");
  const [err,setErr]     = useState("");
  const [show,setShow]   = useState(false);

  const doLogin = () => {
    if (!selId) { setErr("Please select your name."); return; }
    const acct = all.find(a=>String(a.id)===String(selId));
    if (!acct)  { setErr("Account not found."); return; }
    const correct = acct.isAdminManager ? MANAGER_PASSWORD : DEFAULT_PASSWORD;
    if (pw !== correct) { setErr("Incorrect password."); return; }
    onLogin(acct);
  };

  return (
    <div style={L.root}>
      <div style={L.bg}/>
      <div style={L.card}>
        <div style={L.eye}>McDONALD GROUP</div>
        <div style={L.ttl}>LEADERBOARD</div>
        <div style={L.sub}>Sign in to your account</div>
        <div style={L.field}>
          <label style={L.lbl}>YOUR NAME</label>
          <select value={selId} onChange={e=>{setSelId(e.target.value);setErr("");}} style={L.sel}>
            <option value="">— Choose your name —</option>
            {all.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div style={L.field}>
          <label style={L.lbl}>PASSWORD</label>
          <div style={{display:"flex",gap:8}}>
            <input type={show?"text":"password"} value={pw}
              onChange={e=>{setPw(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&doLogin()}
              placeholder="Enter password" style={L.inp}/>
            <button onClick={()=>setShow(p=>!p)} style={L.eyeBtn}>{show?"🙈":"👁️"}</button>
          </div>
        </div>
        {err && <div style={L.err}>{err}</div>}
        <button onClick={doLogin} style={L.btn}>Sign In →</button>
      </div>
    </div>
  );
}

const L = {
  root:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0f1e",position:"relative"},
  bg:{position:"fixed",inset:0,background:"radial-gradient(ellipse at 30% 30%,#1e3a5f44,transparent 60%),radial-gradient(ellipse at 70% 70%,#1a1f4488,transparent 60%)",pointerEvents:"none"},
  card:{position:"relative",zIndex:1,background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:16},
  eye:{fontSize:24,letterSpacing:8,color:"#3949ff",fontWeight:700,textAlign:"center",fontFamily:"Georgia,'Times New Roman',serif",textShadow:"0 2px 8px #3949ff44"},
  ttl:{fontSize:28,fontWeight:900,background:"linear-gradient(135deg,#f59e0b,#fbbf24,#fff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:2,textAlign:"center"},
  sub:{fontSize:13,color:"#64748b",textAlign:"center",marginBottom:8},
  field:{display:"flex",flexDirection:"column",gap:6},
  lbl:{fontSize:10,letterSpacing:2,color:"#64748b",fontWeight:700},
  sel:{padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a0f1e",color:"#f1f5f9",fontSize:14,outline:"none"},
  inp:{flex:1,padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a0f1e",color:"#f1f5f9",fontSize:14,outline:"none"},
  eyeBtn:{padding:"0 12px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a0f1e",cursor:"pointer",fontSize:16},
  err:{background:"#7f1d1d44",border:"1px solid #b91c1c",borderRadius:8,padding:"9px 14px",fontSize:13,color:"#fca5a5"},
  btn:{padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",letterSpacing:1,marginTop:4},
};

// ── Change Password Modal ─────────────────────────────────────
function ChangePwModal({ user, onClose }) {
  const [cur,setCur]   = useState("");
  const [nw,setNw]     = useState("");
  const [conf,setConf] = useState("");
  const [err,setErr]   = useState("");
  const [ok,setOk]     = useState(false);

  const save = async () => {
    const correct = user.isAdminManager ? MANAGER_PASSWORD : DEFAULT_PASSWORD;
    if (cur !== correct) { setErr("Current password is incorrect."); return; }
    if (nw.length < 6)   { setErr("New password must be at least 6 characters."); return; }
    if (nw !== conf)      { setErr("Passwords do not match."); return; }
    try {
      await setDoc(doc(db,"passwords", String(user.id)), { password: nw });
      setOk(true);
      setTimeout(onClose, 1500);
    } catch(e) { setErr("Failed to save. Try again."); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000a",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:16,padding:"28px",width:"100%",maxWidth:360}}>
        <div style={{fontSize:18,fontWeight:900,color:"#f1f5f9",marginBottom:20}}>Change Password</div>
        {ok ? <div style={{fontSize:15,color:"#34d399",textAlign:"center",padding:"20px 0"}}>✅ Password updated!</div> : <>
          {[["Current Password",cur,setCur],["New Password",nw,setNw],["Confirm New Password",conf,setConf]].map(([lbl,val,set])=>(
            <div key={lbl} style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
              <label style={L.lbl}>{lbl.toUpperCase()}</label>
              <input type="password" value={val} onChange={e=>{set(e.target.value);setErr("");}} style={{...L.inp,background:"#0f172a"}}/>
            </div>
          ))}
          {err && <div style={L.err}>{err}</div>}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button onClick={save} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",fontWeight:800,cursor:"pointer"}}>Save</button>
            <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontWeight:700}}>Cancel</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [agents,setAgents]           = useState(AGENTS_DEFAULT);
  const [stats,setStats]             = useState(() => Object.fromEntries(AGENTS_DEFAULT.map(a=>[a.id,initStats()])));
  const [actLog,setActLog]           = useState([]);
  const [currentUser,setUser]        = useState(()=>{ try { const u=localStorage.getItem("mgl-user"); return u?JSON.parse(u):null; } catch(e){ return null; } });
  const [view,setView]               = useState("board");
  const [flash,setFlash]             = useState(null);
  const [confetti,setConfetti]       = useState(false);
  const [celebration,setCelebration] = useState(null);
  const [loaded,setLoaded]           = useState(false);
  const [newName,setNewName]         = useState("");
  const [announcement,setAnn]       = useState("");
  const [editAnn,setEditAnn]         = useState(false);
  const [annDraft,setAnnDraft]       = useState("");
  const [prizes,setPrizes]           = useState({ gold:"", silver:"", bronze:"" });
  const [editPrize,setEditPrize]     = useState(false);
  const [prizeDraft,setPrizeDraft]   = useState({ gold:"", silver:"", bronze:"" });
  const [theme,setTheme]             = useState(()=>{ try { return localStorage.getItem("mgl-theme")||"dark"; } catch(e){ return "dark"; } });
  const [tvTheme,setTvTheme]         = useState(()=>{ try { return localStorage.getItem("mgl-tv-theme")||"midnight"; } catch(e){ return "midnight"; } });
  const [showPwModal,setShowPwModal] = useState(false);
  const [weekLabel,setWeekLabel]     = useState("");
  const [tvMode,setTvMode]           = useState(false);

  const login  = (acct) => { setUser(acct); try { localStorage.setItem("mgl-user", JSON.stringify(acct)); } catch(e){} };
  const logout = () => { setUser(null); try { localStorage.removeItem("mgl-user"); } catch(e){} setView("board"); };

  const isManager    = currentUser?.role === "Manager";
  const canSeePrizes = currentUser && !PRIZE_RESTRICTED_IDS.includes(currentUser.id);
  const T            = theme==="dark" ? DARK : LIGHT;
  const TV           = TV_THEMES[tvTheme] || TV_THEMES.midnight;

  const todayStr = new Date().toDateString();

  const getTodayPoints = (agentId) =>
    actLog.filter(e=>e.agentId===agentId && new Date(e.time?.toDate?.()??e.time).toDateString()===todayStr)
          .reduce((sum,e)=>sum+(POINT_VALUES[e.type]||0),0);

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523,659,784,1047].forEach((freq,i) => {
        const osc=ctx.createOscillator(), gain=ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value=freq; osc.type="sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime+i*0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*0.12+0.3);
        osc.start(ctx.currentTime+i*0.12);
        osc.stop(ctx.currentTime+i*0.12+0.3);
      });
    } catch(e) {}
  };

  // Global celebration listener
  useEffect(()=>{
    const unsub = onSnapshot(doc(db,"settings","celebrate"), snap=>{
      if(snap.exists() && snap.data().active){
        const d = snap.data();
        setConfetti(true); playSound();
        setCelebration({ name:d.by, type:d.type });
        setTimeout(()=>{ setConfetti(false); setCelebration(null); }, 10000);
      }
    });
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    const unsubSettings = onSnapshot(doc(db,"settings","main"), snap=>{
      if(snap.exists()){
        const d=snap.data();
        if(d.agents)                     setAgents(d.agents);
        if(d.stats)                      setStats(d.stats);
        if(d.announcement !== undefined) setAnn(d.announcement);
        if(d.prizes)                     setPrizes(d.prizes);
        if(d.weekLabel !== undefined)    setWeekLabel(d.weekLabel);
      }
      setLoaded(true);
    });
    const logQ = query(collection(db,"activityLog"), orderBy("time","desc"), limit(200));
    const unsubLog = onSnapshot(logQ, snap=>{
      setActLog(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    });
    return ()=>{ unsubSettings(); unsubLog(); };
  },[]);

  const saveSettings = async (patch) => {
    try { await setDoc(doc(db,"settings","main"), patch, { merge:true }); }
    catch(e){ console.error(e); }
  };

  const changeTheme   = (t) => { setTheme(t);   try { localStorage.setItem("mgl-theme",t); } catch(e){} };
  const changeTvTheme = (t) => { setTvTheme(t); try { localStorage.setItem("mgl-tv-theme",t); } catch(e){} };

  const addActivity = async (agentId, type) => {
    const agent    = agents.find(a=>a.id===agentId);
    const prev     = stats[agentId] || initStats();
    const prevPts  = calcPoints(prev);
    const prevTdp  = getTodayPoints(agentId);
    const newStat  = { ...prev, [type]:(prev[type]||0)+1 };
    const newPts   = calcPoints(newStat);
    const newTdp   = prevTdp + (POINT_VALUES[type]||0);
    const newStats = { ...stats, [agentId]:newStat };
    setStats(newStats);
    setFlash({ agentId, type });
    setTimeout(()=>setFlash(null),1200);
    await saveSettings({ stats: newStats });
    await addDoc(collection(db,"activityLog"),{
      time:serverTimestamp(), agentId, agentName:agent?.name, type, by:currentUser.name
    });
    const shouldCelebrate = type==="sold_transfer" || type==="own_sale";
    const milestone = BADGES.find(b=>b.condition(newStat,newPts,newTdp)&&!b.condition(prev,prevPts,prevTdp));
    if(shouldCelebrate || milestone){
      const celebType = shouldCelebrate ? type : "badge";
      await setDoc(doc(db,"settings","celebrate"),{ active:true, by:agent?.name, type:celebType, time:Date.now() });
      setTimeout(async()=>{ await setDoc(doc(db,"settings","celebrate"),{ active:false }); }, 11000);
    }
  };

  const removeActivity = async (agentId, type) => {
    const prev     = stats[agentId] || initStats();
    const newStat  = { ...prev, [type]:Math.max(0,(prev[type]||0)-1) };
    const newStats = { ...stats, [agentId]:newStat };
    setStats(newStats);
    await saveSettings({ stats: newStats });
  };

  const addAgent = async () => {
    if(!newName.trim()) return;
    const id       = Date.now();
    const newAgents= [...agents, {id, name:newName.trim(), role:"Agent"}];
    const newStats = { ...stats, [id]:initStats() };
    setAgents(newAgents); setStats(newStats); setNewName("");
    await saveSettings({ agents:newAgents, stats:newStats });
  };

  const removeAgent = async (id) => {
    const newAgents = agents.filter(a=>a.id!==id);
    setAgents(newAgents);
    await saveSettings({ agents:newAgents });
  };

  const resetAll = async () => {
    if(!window.confirm("Reset all points? This cannot be undone.")) return;
    const newStats = Object.fromEntries(agents.map(a=>[a.id,initStats()]));
    setStats(newStats);
    await saveSettings({ stats:newStats });
  };

  const ranked = [...agents]
    .map(a=>({...a, stats:stats[a.id]||initStats()}))
    .map(a=>({...a, points:calcPoints(a.stats), apps:calcApps(a.stats)}))
    .sort((a,b)=>b.points-a.points);

  const totPts   = ranked.reduce((s,a)=>s+a.points,0);
  const totApps  = ranked.reduce((s,a)=>s+a.apps,0);
  const totTrans = ranked.reduce((s,a)=>s+a.stats.transfer,0);

  const actTypes = [
    {type:"transfer",        label:"Sent Transfer",     color:"#3b82f6", pts:1},
    {type:"sold_transfer",   label:"Sent & Closed",     color:"#8b5cf6", pts:1},
    {type:"closed_transfer", label:"Received & Closed", color:"#f59e0b", pts:2},
    {type:"own_sale",        label:"Own Sale",           color:"#10b981", pts:3},
  ];

  const fmtTime   = ts => { const d=new Date(ts?.toDate?.()??ts); return d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); };
  const typeLabel = t => actTypes.find(a=>a.type===t)?.label||t;
  const typeColor = t => actTypes.find(a=>a.type===t)?.color||"#fff";
  const entryAgents = isManager ? ranked : ranked.filter(a=>a.id===currentUser?.id);
  const navItems    = ["board","entry","stats",...(isManager?["feed","manage"]:[])];
  const myData      = ranked.find(a=>a.id===currentUser?.id);
  const myRank      = myData ? ranked.indexOf(myData)+1 : null;

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",color:"#60a5fa",fontSize:18,fontWeight:700,fontFamily:"'Trebuchet MS',sans-serif"}}>
      Loading McDonald Group Leaderboard...
    </div>
  );

  if(!currentUser) return <LoginScreen agents={agents} onLogin={login}/>;

  return (
    <div style={{...S.root,background:T.bg,color:T.text}}>
      <Confetti active={confetti} tvTheme={tvTheme}/>
      <CelebrationBanner celebration={celebration}/>
      {showPwModal && <ChangePwModal user={currentUser} onClose={()=>setShowPwModal(false)}/>}

      {/* TV MODE */}
      {tvMode && (
        <div style={{
          position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",padding:"24px 40px",overflow:"hidden",
          background:TV.animated?undefined:TV.bg,
          backgroundImage:TV.animated?TV.animBg:undefined,
          backgroundSize:TV.animated?"400% 400%":undefined,
          animation:TV.animated?"tvAnim 8s ease infinite":undefined,
        }}>
          {TV.animated && <style>{TV.animStyle}</style>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontSize:13,letterSpacing:6,color:TV.accent,fontWeight:700}}>McDONALD GROUP</div>
              <div style={{fontSize:36,fontWeight:900,background:"linear-gradient(135deg,#f59e0b,#fbbf24,#fff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:3}}>LEADERBOARD</div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              {[{label:"TOTAL POINTS",value:totPts},{label:"APPS WRITTEN",value:totApps},{label:"TRANSFERS",value:totTrans}].map(s=>(
                <div key={s.label} style={{textAlign:"center",background:TV.card,border:`1px solid ${TV.border}`,borderRadius:12,padding:"10px 20px"}}>
                  <div style={{fontSize:28,fontWeight:900,color:"#f59e0b",lineHeight:1}}>{s.value}</div>
                  <div style={{fontSize:10,letterSpacing:2,color:TV.muted,marginTop:4,fontWeight:700}}>{s.label}</div>
                </div>
              ))}
              <select value={tvTheme} onChange={e=>changeTvTheme(e.target.value)}
                style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${TV.border}`,background:TV.card,color:TV.text,fontSize:12,cursor:"pointer",outline:"none"}}>
                {Object.entries(TV_THEMES).map(([key,val])=>(
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
              <button onClick={()=>setTvMode(false)} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${TV.border}`,background:"transparent",color:TV.muted,cursor:"pointer",fontSize:13,fontWeight:700}}>Exit</button>
            </div>
          </div>
          {/* Weekly Bible Verse */}
          {(()=>{ const v=getWeeklyVerse(); return (
            <div style={{textAlign:"center",marginBottom:16,padding:"12px 24px",background:TV.card,border:`1px solid ${TV.border}`,borderRadius:14,opacity:0.9}}>
              <div style={{fontSize:"clamp(11px,1.2vw,15px)",color:TV.accent,fontWeight:700,letterSpacing:2,marginBottom:6}}>✝️ VERSE OF THE WEEK</div>
              <div style={{fontSize:"clamp(13px,1.5vw,18px)",color:TV.text,fontStyle:"italic",lineHeight:1.5,maxWidth:900,margin:"0 auto"}}>"{v.text}"</div>
              <div style={{fontSize:"clamp(11px,1.2vw,14px)",color:TV.muted,fontWeight:700,marginTop:6,letterSpacing:1}}>— {v.ref}</div>
            </div>
          ); })()}
          {canSeePrizes && (prizes.gold||prizes.silver||prizes.bronze) && (
            <div style={{display:"flex",gap:16,marginBottom:16,justifyContent:"center"}}>
              {prizes.gold   && <span style={{fontSize:16,fontWeight:700,color:TV.text,background:TV.card,border:`1px solid ${TV.border}`,padding:"6px 18px",borderRadius:20}}>🥇 {prizes.gold}</span>}
              {prizes.silver && <span style={{fontSize:16,fontWeight:700,color:TV.text,background:TV.card,border:`1px solid ${TV.border}`,padding:"6px 18px",borderRadius:20}}>🥈 {prizes.silver}</span>}
              {prizes.bronze && <span style={{fontSize:16,fontWeight:700,color:TV.text,background:TV.card,border:`1px solid ${TV.border}`,padding:"6px 18px",borderRadius:20}}>🥉 {prizes.bronze}</span>}
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8,flex:1,overflowY:"auto"}}>
            {ranked.map((agent,idx)=>{
              const maxPts=ranked[0]?.points||1, pct=maxPts>0?(agent.points/maxPts)*100:0;
              const isTop3=idx<3;
              const tc=isTop3?TV.top3[idx]:null;
              const agentBadges=BADGES.filter(b=>b.condition(agent.stats,agent.points,getTodayPoints(agent.id)));
              return (
                <div key={agent.id} style={{display:"flex",alignItems:"center",gap:20,borderRadius:14,padding:"14px 24px",
                  background:isTop3?tc.bg:TV.card,
                  border:isTop3?`1px solid ${tc.border}`:`1px solid ${TV.border}`,
                  boxShadow:isTop3?`0 0 24px ${tc.glow}`:"none"}}>
                  <div style={{width:70,textAlign:"center",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    {isTop3
                      ? <><Trophy rank={idx} size={52} colors={tc}/><span style={{fontSize:10,fontWeight:900,letterSpacing:1,color:tc.cup}}>{tc.label}</span></>
                      : <span style={{fontSize:24,fontWeight:900,color:TV.muted}}>{idx+1}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:22,fontWeight:900,color:isTop3?tc.shine:TV.text,display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                      {agent.name}
                      {agentBadges.map(b=>(
                        <span key={b.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:13,fontWeight:700,padding:"2px 10px",borderRadius:20,background:TV.card,border:"1px solid #f59e0b66",color:"#fbbf24"}}>
                          {b.icon} {b.label}
                        </span>
                      ))}
                    </div>
                    <div style={{height:8,background:TV.border,borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,width:`${pct}%`,transition:"width .6s cubic-bezier(.4,0,.2,1)",
                        background:isTop3?`linear-gradient(90deg,${tc.cup},${tc.shine})`:`linear-gradient(90deg,${TV.accent},${TV.muted})`}}/>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,minWidth:80}}>
                    <span style={{fontSize:isTop3?48:40,fontWeight:900,color:isTop3?tc.cup:TV.accent,lineHeight:1}}>{agent.points}</span>
                    <span style={{fontSize:12,color:TV.muted,letterSpacing:2,fontWeight:700}}>PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT */}
      {(announcement||isManager) && (
        <div style={{...S.banner,background:T.bannerBg,borderBottom:`1px solid ${T.border}`}}>
          {editAnn ? (
            <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
              <input value={annDraft} onChange={e=>setAnnDraft(e.target.value)} placeholder="Type announcement..."
                style={{...S.inlineInput,background:T.cardBg,color:T.text,border:`1px solid ${T.border}`}}/>
              <button onClick={async()=>{setAnn(annDraft);setEditAnn(false);await saveSettings({announcement:annDraft});}} style={S.saveBtn}>Save</button>
              <button onClick={()=>setEditAnn(false)} style={S.cancelBtn}>Cancel</button>
            </div>
          ) : (
            <>
              <span style={{fontSize:13,color:"#fbbf24",flex:1}}>📢 {announcement||"No announcement set."}</span>
              {isManager && <button onClick={()=>{setAnnDraft(announcement);setEditAnn(true);}} style={S.editAnnBtn}>Edit</button>}
            </>
          )}
        </div>
      )}

      {/* HEADER */}
      <div style={{...S.header,background:T.headerBg,borderBottom:`1px solid ${T.border}`}}>
        <div>
          <div style={{fontSize:11,letterSpacing:4,color:"#60a5fa",fontWeight:700,marginBottom:2}}>McDONALD GROUP</div>
          <div style={S.title}>LEADERBOARD</div>
        </div>
        <div style={S.headerRight}>
          <div style={S.headerNav}>
            {navItems.map(v=>(
              <button key={v} onClick={()=>setView(v)}
                style={{...S.navBtn,border:`1px solid ${T.border}`,color:T.muted,...(view===v?{background:"#1e3a5f",color:"#f1f5f9",borderColor:"#3b82f6"}:{})}}>
                {v==="board"?"🏆 Board":v==="entry"?"➕ Log":v==="stats"?"📈 Stats":v==="feed"?"📋 Feed":"⚙️ Manage"}
              </button>
            ))}
            <button onClick={()=>changeTheme(theme==="dark"?"light":"dark")}
              style={{...S.navBtn,border:`1px solid ${T.border}`,color:T.muted}}>
              {theme==="dark"?"☀️":"🌙"}
            </button>
            {isManager && (
              <button onClick={()=>setTvMode(v=>!v)}
                style={{...S.navBtn,border:`1px solid ${tvMode?"#f59e0b":T.border}`,color:tvMode?"#f59e0b":T.muted}}>
                📺 {tvMode?"Exit TV":"TV Mode"}
              </button>
            )}
          </div>
          <div style={{...S.userBadge,background:T.cardBg,border:`1px solid ${T.border}`}}>
            <div style={S.userIcon}>{currentUser.name[0]}</div>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{currentUser.name}</span>
            {isManager && <span style={S.mgrTag}>MGR</span>}
            <button onClick={()=>setShowPwModal(true)} style={{...S.signOutBtn,color:T.muted,border:`1px solid ${T.border}`}}>🔑</button>
            <button onClick={logout} style={{...S.signOutBtn,color:T.muted,border:`1px solid ${T.border}`}}>Sign out</button>
          </div>
        </div>
      </div>

      {/* PRIZES */}
      {canSeePrizes && (prizes.gold||prizes.silver||prizes.bronze||isManager) && (
        <div style={{...S.prizeBanner,background:T.cardBg,borderBottom:`1px solid ${T.border}`}}>
          {editPrize ? (
            <div style={{display:"flex",gap:10,flex:1,flexWrap:"wrap",alignItems:"center"}}>
              {["gold","silver","bronze"].map(p=>(
                <input key={p} value={prizeDraft[p]} onChange={e=>setPrizeDraft(d=>({...d,[p]:e.target.value}))}
                  placeholder={`${p.charAt(0).toUpperCase()+p.slice(1)} prize...`}
                  style={{...S.inlineInput,flex:1,minWidth:120,background:T.cardBg,color:T.text,border:`1px solid ${T.border}`}}/>
              ))}
              <button onClick={async()=>{setPrizes(prizeDraft);setEditPrize(false);await saveSettings({prizes:prizeDraft});}} style={S.saveBtn}>Save</button>
              <button onClick={()=>setEditPrize(false)} style={S.cancelBtn}>Cancel</button>
            </div>
          ) : (
            <>
              <span style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:2,marginRight:8}}>{weekLabel||"THIS WEEK'S PRIZES"}</span>
              {prizes.gold   && <span style={S.prizeItem}>🥇 {prizes.gold}</span>}
              {prizes.silver && <span style={S.prizeItem}>🥈 {prizes.silver}</span>}
              {prizes.bronze && <span style={S.prizeItem}>🥉 {prizes.bronze}</span>}
              {isManager && (
                <>
                  <input value={weekLabel} onChange={e=>setWeekLabel(e.target.value)}
                    onBlur={async()=>await saveSettings({weekLabel})}
                    placeholder="Week label..." style={{...S.inlineInput,width:140,marginLeft:12,background:T.cardBg,color:T.text,border:`1px solid ${T.border}`}}/>
                  <button onClick={()=>{setPrizeDraft(prizes);setEditPrize(true);}} style={S.editAnnBtn}>Edit Prizes</button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* STATS BAR */}
      <div style={{display:"flex",gap:12,padding:"14px 24px",flexWrap:"wrap"}}>
        {[{label:"TOTAL POINTS",value:totPts},{label:"APPS WRITTEN",value:totApps},{label:"TRANSFERS",value:totTrans},{label:"ACTIVE AGENTS",value:agents.length}].map(s=>(
          <div key={s.label} style={{flex:"1 1 110px",background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:26,fontWeight:900,color:"#f59e0b",lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,letterSpacing:2,color:T.muted,marginTop:4,fontWeight:700}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* BOARD */}
      {view==="board" && (
        <div style={S.content}>
          <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
            {[{label:"Sent Transfer",pts:1,color:"#60a5fa"},{label:"Sent & Closed",pts:1,color:"#a78bfa"},{label:"Received & Closed",pts:2,color:"#f59e0b"},{label:"Own Sale",pts:3,color:"#34d399"}].map(item=>(
              <div key={item.label} style={{display:"flex",alignItems:"center",gap:6,background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:20,padding:"5px 12px"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:item.color}}/>
                <span style={{fontSize:12,color:T.muted}}>{item.label}</span>
                <span style={{fontSize:12,fontWeight:800,color:item.color}}>+{item.pts} pts</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {ranked.map((agent,idx)=>{
              const isMe=agent.id===currentUser.id, isFlash=flash?.agentId===agent.id;
              const maxPts=ranked[0]?.points||1, pct=maxPts>0?(agent.points/maxPts)*100:0;
              const tc=TROPHY_COLORS[theme][idx], isTop3=idx<3;
              const agentBadges=BADGES.filter(b=>b.condition(agent.stats,agent.points,getTodayPoints(agent.id)));
              return (
                <div key={agent.id} style={{display:"flex",alignItems:"center",gap:16,borderRadius:12,padding:"14px 18px",transition:"all .3s",
                  background:isTop3?tc.bg:T.cardBg,
                  border:isTop3?`1px solid ${tc.border}`:isMe?`1px solid #2563eb66`:`1px solid ${T.border}`,
                  boxShadow:isTop3?`0 0 18px ${tc.glow}`:isMe?"0 0 14px #2563eb33":"none",
                  ...(isFlash?{background:"#1a3a1a",border:"1px solid #34d399"}:{})}}>
                  <div style={{width:52,textAlign:"center",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    {isTop3
                      ? <><Trophy rank={idx} size={44}/><span style={{fontSize:9,fontWeight:900,letterSpacing:1,color:tc.cup}}>{tc.label}</span></>
                      : <span style={{fontSize:18,fontWeight:900,color:T.muted}}>{idx+1}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:800,color:isTop3?tc.shine:T.text,display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                      {agent.name}
                      {agent.role==="Manager"&&isManager&&<span style={S.mgrTag}>MGR</span>}
                      {isMe&&<span style={S.meBadge}>YOU</span>}
                      {agentBadges.map(b=>(
                        <span key={b.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#1e293b",border:"1px solid #f59e0b66",color:"#fbbf24",whiteSpace:"nowrap"}}>
                          {b.icon} {b.label}
                        </span>
                      ))}
                    </div>
                    <div style={{height:6,background:theme==="dark"?"#1e293b":"#e2e8f0",borderRadius:3,overflow:"hidden",marginBottom:6}}>
                      <div style={{height:"100%",borderRadius:3,width:`${pct}%`,transition:"width .6s cubic-bezier(.4,0,.2,1)",
                        background:isTop3?`linear-gradient(90deg,${tc.cup},${tc.shine})`:"linear-gradient(90deg,#2563eb,#60a5fa)"}}/>
                    </div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,color:"#60a5fa"}}>⟶ {agent.stats.transfer} transfers</span>
                      <span style={{fontSize:11,color:"#a78bfa"}}>✓ {agent.stats.sold_transfer} s&c</span>
                      <span style={{fontSize:11,color:"#f59e0b"}}>⊕ {agent.stats.closed_transfer} r&c</span>
                      <span style={{fontSize:11,color:"#34d399"}}>★ {agent.stats.own_sale} own</span>
                      <span style={{fontSize:11,color:"#f59e0b",fontWeight:700}}>{agent.apps} apps</span>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                    <span style={{fontSize:isTop3?36:32,fontWeight:900,color:isTop3?tc.cup:"#60a5fa",lineHeight:1}}>{agent.points}</span>
                    <span style={{fontSize:10,color:T.muted,letterSpacing:2,fontWeight:700}}>PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LOG ACTIVITY */}
      {view==="entry" && (
        <div style={S.content}>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:6,letterSpacing:1}}>Log Activity</div>
          <p style={{fontSize:13,color:T.muted,marginBottom:20}}>{isManager?"Log activity for any agent.":"Log your own activity below."}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
            {entryAgents.map(agent=>(
              <div key={agent.id} style={{background:T.cardBg,border:`1px solid ${agent.id===currentUser.id?"#2563eb66":T.border}`,boxShadow:agent.id===currentUser.id?"0 0 12px #2563eb22":"none",borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  {agent.name}{agent.id===currentUser.id&&<span style={S.meBadge}>YOU</span>}
                </div>
                <div style={{fontSize:12,color:"#f59e0b",fontWeight:700,marginBottom:12}}>{agent.points} pts</div>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                  {actTypes.map(act=>(
                    <div key={act.type} style={{display:"flex",gap:6}}>
                      <button onClick={()=>addActivity(agent.id,act.type)} style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",background:act.color}}>
                        +{act.pts} {act.label}
                      </button>
                      <button onClick={()=>removeActivity(agent.id,act.type)} style={{padding:"7px 10px",borderRadius:7,border:`1px solid ${T.border}`,background:T.cardBg,color:T.muted,fontWeight:900,fontSize:14,cursor:"pointer"}}>−</button>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,fontSize:11,color:T.muted,flexWrap:"wrap"}}>
                  <span>{agent.stats.transfer} sent</span><span>{agent.stats.sold_transfer} s&c</span>
                  <span>{agent.stats.closed_transfer} r&c</span><span>{agent.stats.own_sale} own</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS */}
      {view==="stats" && (
        <div style={S.content}>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:20,letterSpacing:1}}>{myData?`${currentUser.name}'s Stats`:"Team Stats"}</div>
          {myData && (
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:28}}>
              {[{label:"Your Rank",value:`#${myRank}`},{label:"Total Points",value:myData.points},{label:"Apps Written",value:myData.apps},{label:"Transfers",value:myData.stats.transfer}].map(s=>(
                <div key={s.label} style={{flex:"1 1 100px",background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:26,fontWeight:900,color:"#60a5fa",lineHeight:1}}>{s.value}</div>
                  <div style={{fontSize:10,letterSpacing:2,color:T.muted,marginTop:4,fontWeight:700}}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {myData && (
            <div style={{marginBottom:28}}>
              <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:12,letterSpacing:1}}>YOUR BADGES</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {BADGES.map(b=>{
                  const earned=b.condition(myData.stats,myData.points,getTodayPoints(myData.id));
                  return (
                    <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:20,background:T.cardBg,border:`1px solid ${earned?"#f59e0b66":T.border}`,opacity:earned?1:0.35}}>
                      <span style={{fontSize:18}}>{b.icon}</span>
                      <span style={{fontSize:13,fontWeight:700,color:earned?"#fbbf24":T.muted}}>{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:12,letterSpacing:1}}>TEAM BREAKDOWN</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ranked.map((agent,idx)=>(
              <div key={agent.id} style={{display:"flex",alignItems:"center",gap:16,borderRadius:12,padding:"12px 16px",background:T.cardBg,border:`1px solid ${T.border}`}}>
                <div style={{width:28,fontWeight:900,color:T.muted,fontSize:14}}>{idx+1}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:6}}>{agent.name}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {actTypes.map(at=>(
                      <div key={at.type} style={{fontSize:11,padding:"3px 8px",borderRadius:10,background:at.color+"22",color:at.color,fontWeight:700}}>
                        {at.label.split(" ")[0]}: {agent.stats[at.type]}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <span style={{fontSize:24,fontWeight:900,color:"#60a5fa"}}>{agent.points}</span>
                  <span style={{fontSize:9,color:T.muted,letterSpacing:2}}>PTS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEED */}
      {view==="feed" && isManager && (
        <div style={S.content}>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:20,letterSpacing:1}}>Activity Feed</div>
          {actLog.length===0 && <div style={{color:T.muted,fontSize:14}}>No activity logged yet.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {actLog.slice(0,100).map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderRadius:10,background:T.cardBg,border:`1px solid ${T.border}`}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:typeColor(e.type),flexShrink:0}}/>
                <div style={{flex:1}}>
                  <span style={{fontWeight:800,color:T.text}}>{e.agentName}</span>
                  <span style={{color:T.muted,fontSize:13}}> · {typeLabel(e.type)}</span>
                  {e.by&&e.by!==e.agentName&&<span style={{color:T.muted,fontSize:12}}> (logged by {e.by})</span>}
                </div>
                <div style={{fontSize:11,color:T.muted}}>{fmtTime(e.time)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MANAGE */}
      {view==="manage" && isManager && (
        <div style={S.content}>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:16,letterSpacing:1}}>Manage Agents</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
            {agents.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 16px"}}>
                <span style={{flex:1,fontSize:14,fontWeight:700,color:T.text}}>{a.name}</span>
                <span style={{fontSize:12,color:T.muted}}>{a.role}</span>
                <button onClick={()=>removeAgent(a.id)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:12,cursor:"pointer",fontWeight:600}}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addAgent()}
              placeholder="New agent name..." style={{flex:1,padding:"10px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:T.cardBg,color:T.text,fontSize:14,outline:"none"}}/>
            <button onClick={addAgent} style={{padding:"10px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Add Agent</button>
          </div>
          <button onClick={resetAll} style={{padding:"10px 20px",borderRadius:8,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer"}}>🔄 Reset All Points</button>
        </div>
      )}
    </div>
  );
}

const S = {
  root:{minHeight:"100vh",fontFamily:"'Trebuchet MS',sans-serif",position:"relative",overflow:"hidden"},
  banner:{display:"flex",alignItems:"center",gap:12,padding:"8px 24px",flexWrap:"wrap"},
  prizeBanner:{display:"flex",alignItems:"center",gap:12,padding:"8px 24px",flexWrap:"wrap"},
  prizeItem:{fontSize:13,fontWeight:700,color:"#f1f5f9",background:"#1e293b",padding:"4px 12px",borderRadius:20},
  header:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 24px 10px",flexWrap:"wrap",gap:12,position:"relative",zIndex:1},
  title:{fontSize:22,fontWeight:900,background:"linear-gradient(135deg,#f59e0b,#fbbf24,#fff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:2},
  headerRight:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8},
  headerNav:{display:"flex",gap:6,flexWrap:"wrap"},
  navBtn:{padding:"7px 13px",borderRadius:8,background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600},
  userBadge:{display:"flex",alignItems:"center",gap:8,borderRadius:20,padding:"5px 12px"},
  userIcon:{width:24,height:24,borderRadius:"50%",background:"#2563eb",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#fff"},
  mgrTag:{fontSize:9,background:"#1e3a5f",color:"#60a5fa",padding:"2px 6px",borderRadius:4,letterSpacing:1,fontWeight:700},
  meBadge:{fontSize:9,background:"#1e3a8a",color:"#93c5fd",padding:"2px 6px",borderRadius:4,letterSpacing:1,fontWeight:700},
  signOutBtn:{padding:"4px 10px",borderRadius:6,background:"transparent",fontSize:11,cursor:"pointer",fontWeight:600},
  content:{padding:"16px 24px 40px",position:"relative",zIndex:1},
  inlineInput:{padding:"5px 10px",borderRadius:7,fontSize:13,outline:"none"},
  saveBtn:{padding:"5px 14px",borderRadius:7,border:"none",background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"},
  cancelBtn:{padding:"5px 14px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"},
  editAnnBtn:{padding:"4px 12px",borderRadius:6,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontSize:12,cursor:"pointer",fontWeight:600},
};