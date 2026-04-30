import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  doc, setDoc, onSnapshot, collection, addDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp, getDocs
} from "firebase/firestore";

const DEFAULT_PASSWORD  = "Password123!";
const MANAGER_PASSWORD  = "Mcdonald123!";
const PRIZE_RESTRICTED_IDS = [10, 9, 12, 8];
const POINT_VALUES = { transfer:1, qualified_transfer:2, sold_transfer:1, sold_qualified_transfer:1, closed_transfer:3, closed_qualified_transfer:2, own_sale:3, hospital_sale:3, rewrite:1.5 };
const APP_TRACKER_IDS = []; // Destiny, Hailie, Kaitlin, Layla — set to [1,2,3,5] to re-enable
const APP_TARGET_MIN    = 6;
const APP_TARGET_FRIDAY = 10;

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
  { id:8,  name:"Christian Kanupke", role:"Agent" },
  { id:9,  name:"Austin Oblow",      role:"Agent" },
  { id:10, name:"Chipper Wiley",     role:"Agent" },
  { id:11, name:"Madison Crowley",   role:"Manager" },
  { id:12, name:"Dana Gordy",        role:"Agent" },
  { id:13, name:"Christian Morley",   role:"Agent" },
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
    label:"Midnight", animated:false,
    bg:"#0a0f1e", card:"#0f172a", border:"#1e3a5f", text:"#f1f5f9", muted:"#64748b", accent:"#60a5fa",
    top3:[
      { cup:"#f59e0b", shine:"#fde68a", shadow:"#b45309", glow:"#f59e0b55", label:"GOLD",   border:"#f59e0b66", bg:"linear-gradient(135deg,#1c1500,#0f172a)" },
      { cup:"#cbd5e1", shine:"#f1f5f9", shadow:"#64748b", glow:"#94a3b855", label:"SILVER", border:"#94a3b855", bg:"linear-gradient(135deg,#0f1520,#0f172a)" },
      { cup:"#c2773a", shine:"#f0a968", shadow:"#7c4a1e", glow:"#c2773a55", label:"BRONZE", border:"#c2773a55", bg:"linear-gradient(135deg,#180e05,#0f172a)" },
    ],
  },
  inferno: {
    label:"Inferno", animated:true,
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
    label:"Galaxy", animated:true,
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
    label:"Game Day", animated:false,
    bg:"#0a0e1a", card:"#0f1729", border:"#1e3a6e", text:"#f1f5f9", muted:"#94a3b8", accent:"#3b82f6",
    top3:[
      { cup:"#1d4ed8", shine:"#93c5fd", shadow:"#1e3a8a", glow:"#1d4ed855", label:"NAVY",  border:"#1d4ed866", bg:"linear-gradient(135deg,#0a0e1a,#1e3a8a33)" },
      { cup:"#dc2626", shine:"#fca5a5", shadow:"#991b1b", glow:"#dc262655", label:"RED",   border:"#dc262666", bg:"linear-gradient(135deg,#0a0e1a,#7f1d1d33)" },
      { cup:"#e2e8f0", shine:"#ffffff", shadow:"#94a3b8", glow:"#e2e8f055", label:"WHITE", border:"#e2e8f066", bg:"linear-gradient(135deg,#0a0e1a,#33415533)" },
    ],
  },
  ice: {
    label:"Ice", animated:false,
    bg:"#000d1a", card:"#001a33", border:"#0ea5e9", text:"#e0f2fe", muted:"#7dd3fc", accent:"#38bdf8",
    top3:[
      { cup:"#e0f2fe", shine:"#ffffff", shadow:"#0369a1", glow:"#e0f2fe55", label:"DIAMOND", border:"#e0f2fe66", bg:"linear-gradient(135deg,#001a33,#000d1a)" },
      { cup:"#7dd3fc", shine:"#bae6fd", shadow:"#0284c7", glow:"#7dd3fc55", label:"FROST",   border:"#7dd3fc66", bg:"linear-gradient(135deg,#001020,#000d1a)" },
      { cup:"#38bdf8", shine:"#7dd3fc", shadow:"#0369a1", glow:"#38bdf855", label:"GLACIER", border:"#38bdf866", bg:"linear-gradient(135deg,#000d20,#000d1a)" },
    ],
  },
  day: {
    label:"Day", animated:false,
    bg:"#f0f4ff", card:"#ffffff", border:"#bfcfe8", text:"#0f172a", muted:"#64748b", accent:"#2563eb",
    top3:[
      { cup:"#b45309", shine:"#78350f", shadow:"#92400e", glow:"#f59e0b44", label:"GOLD",   border:"#f59e0b99", bg:"linear-gradient(135deg,#fef9c3,#fef3c7)" },
      { cup:"#475569", shine:"#1e293b", shadow:"#334155", glow:"#94a3b844", label:"SILVER", border:"#94a3b899", bg:"linear-gradient(135deg,#f1f5f9,#e2e8f0)" },
      { cup:"#7c4a1e", shine:"#92400e", shadow:"#6b3a16", glow:"#c2773a44", label:"BRONZE", border:"#c2773a99", bg:"linear-gradient(135deg,#fde8d0,#fddbb4)" },
    ],
  },
};

const BADGE_ICONS = {
  first_sale: "\uD83C\uDFAF",
  ten_transfers: "\u26A1",
  hat_trick: "\uD83C\uDFA9",
  closer: "\uD83D\uDD12",
  mvp: "\uD83D\uDC51",
  on_fire: "\uD83D\uDD25",
  doctor: "\uD83D\uDC68\u200D\u2695\uFE0F",
};

const BADGES = [
  { id:"first_sale",    label:"First Sale",      icon:BADGE_ICONS.first_sale,    condition: function(s,pts,tdp,wk){ return s.own_sale >= 1; } },
  { id:"ten_transfers", label:"10 Transfers",    icon:BADGE_ICONS.ten_transfers, condition: function(s,pts,tdp,wk){ return s.transfer >= 10; } },
  { id:"hat_trick",     label:"Hat Trick",       icon:BADGE_ICONS.hat_trick,     condition: function(s,pts,tdp,wk){ return s.own_sale >= 3; } },
  { id:"closer",        label:"Closer",          icon:BADGE_ICONS.closer,        condition: function(s,pts,tdp,wk){ return (s.sold_transfer+(s.sold_qualified_transfer||0)+s.closed_transfer+(s.closed_qualified_transfer||0)) >= 5; } },
  { id:"mvp",           label:"25 Points",       icon:BADGE_ICONS.mvp,           condition: function(s,pts,tdp,wk){ return pts >= 25; } },
  { id:"on_fire",       label:"On Fire",         icon:BADGE_ICONS.on_fire,       condition: function(s,pts,tdp,wk){ return pts >= 15 || tdp >= 6; } },
  { id:"doctor",        label:"Doctor",          icon:BADGE_ICONS.doctor,        condition: function(s,pts,tdp,wk){ return (wk||0) >= 3; } },
];

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
  { ref:"Psalm 27:1",       text:"The Lord is my light and my salvation whom shall I fear? The Lord is the stronghold of my life of whom shall I be afraid?" },
  { ref:"Matthew 11:28",    text:"Come to me, all you who are weary and burdened, and I will give you rest." },
  { ref:"Romans 15:13",     text:"May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit." },
  { ref:"Ephesians 2:8-9",  text:"For it is by grace you have been saved, through faith and this is not from yourselves, it is the gift of God not by works, so that no one can boast." },
  { ref:"1 Corinthians 13:4", text:"Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking." },
  { ref:"Psalm 37:4",       text:"Take delight in the Lord, and he will give you the desires of your heart." },
  { ref:"Proverbs 22:6",    text:"Start children off on the way they should go, and even when they are old they will not turn from it." },
  { ref:"Philippians 4:6",  text:"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God." },
  { ref:"1 John 4:19",      text:"We love because he first loved us." },
  { ref:"James 1:2-3",      text:"Consider it pure joy whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance." },
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
  { ref:"Micah 6:8",        text:"He has shown you what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God." },
  { ref:"Isaiah 43:2",      text:"When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you." },
  { ref:"Deuteronomy 31:8", text:"The Lord himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged." },
  { ref:"Romans 5:8",       text:"But God demonstrates his own love for us in this: While we were still sinners, Christ died for us." },
  { ref:"Psalm 32:8",       text:"I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you." },
  { ref:"John 10:10",       text:"The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full." },
  { ref:"1 Peter 5:7",      text:"Cast all your anxiety on him because he cares for you." },
  { ref:"Proverbs 4:23",    text:"Above all else, guard your heart, for everything you do flows from it." },
  { ref:"Matthew 5:9",      text:"Blessed are the peacemakers, for they will be called children of God." },
  { ref:"Psalm 23:4",       text:"Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me." },
];

function getWeeklyVerse() {
  var now = new Date();
  var startOfYear = new Date(now.getFullYear(), 0, 1);
  var weekNum = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
  return BIBLE_VERSES[weekNum % BIBLE_VERSES.length];
}

function calcPoints(s) { return s.transfer*1 + (s.qualified_transfer||0)*2 + s.sold_transfer*1 + (s.sold_qualified_transfer||0)*1 + s.closed_transfer*3 + (s.closed_qualified_transfer||0)*2 + s.own_sale*3 + (s.hospital_sale||0)*3 + (s.rewrite||0)*1.5; }
function calcApps(s)   { return s.sold_transfer + (s.sold_qualified_transfer||0) + s.closed_transfer + (s.closed_qualified_transfer||0) + s.own_sale + (s.hospital_sale||0); }
function initStats()   { return { transfer:0, qualified_transfer:0, sold_transfer:0, sold_qualified_transfer:0, closed_transfer:0, closed_qualified_transfer:0, own_sale:0, hospital_sale:0, rewrite:0 }; }

function calcWeeklyApps(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId &&
      (e.type === "own_sale" || e.type === "sold_transfer" || e.type === "sold_qualified_transfer" || e.type === "closed_transfer" || e.type === "closed_qualified_transfer") &&
      t >= monday;
  }).length;
}

function calcWeeklyHospital(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId && e.type === "hospital_sale" && t >= monday;
  }).length;
}

function calcWeeklyTransfers(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId && e.type === "transfer" && t >= monday;
  }).length;
}

function calcWeeklyQualifiedTransfers(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId && e.type === "qualified_transfer" && t >= monday;
  }).length;
}

function calcWeeklySentTransfersClosed(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId && e.type === "sold_transfer" && t >= monday;
  }).length;
}

function calcWeeklySentQualifiedTransfersClosed(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId && e.type === "sold_qualified_transfer" && t >= monday;
  }).length;
}

function calcWeeklyReceivedTransfersClosed(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId && e.type === "closed_transfer" && t >= monday;
  }).length;
}

function calcWeeklyReceivedQualifiedTransfersClosed(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId && e.type === "closed_qualified_transfer" && t >= monday;
  }).length;
}

function calcWeeklyOwnSales(actLog, agentId) {
  var now = new Date();
  var day = now.getDay();
  var diff = now.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(new Date(now).setDate(diff));
  monday.setHours(0,0,0,0);
  return actLog.filter(function(e) {
    var t = new Date(e.time && e.time.toDate ? e.time.toDate() : e.time);
    return e.agentId === agentId && e.type === "own_sale" && t >= monday;
  }).length;
}

var DARK  = { bg:"#0a0f1e", text:"#f1f5f9", muted:"#64748b", cardBg:"#0f172a", border:"#1e3a5f", headerBg:"#0a0f1e", bannerBg:"#0f172a" };
var LIGHT = { bg:"#f1f5f9", text:"#0f172a", muted:"#64748b", cardBg:"#ffffff", border:"#cbd5e1", headerBg:"#ffffff", bannerBg:"#f8fafc" };

function Trophy({ rank, size, colors }) {
  size = size || 48;
  var c = colors || TROPHY_COLORS.dark[rank];
  if (!c) return null;
  return (
    React.createElement("svg", { width:size, height:size, viewBox:"0 0 48 48", fill:"none" },
      React.createElement("defs", null,
        React.createElement("radialGradient", { id:"glow"+rank, cx:"50%", cy:"50%", r:"50%" },
          React.createElement("stop", { offset:"0%", stopColor:c.shine, stopOpacity:"0.9" }),
          React.createElement("stop", { offset:"100%", stopColor:c.cup, stopOpacity:"0.6" })
        )
      ),
      React.createElement("rect", { x:"14", y:"40", width:"20", height:"3", rx:"1.5", fill:c.shadow }),
      React.createElement("rect", { x:"20", y:"34", width:"8", height:"7", rx:"1", fill:c.cup }),
      React.createElement("path", { d:"M10 16 Q6 16 6 22 Q6 28 12 28", stroke:c.cup, strokeWidth:"2.5", fill:"none", strokeLinecap:"round" }),
      React.createElement("path", { d:"M38 16 Q42 16 42 22 Q42 28 36 28", stroke:c.cup, strokeWidth:"2.5", fill:"none", strokeLinecap:"round" }),
      React.createElement("path", { d:"M12 10 L36 10 L32 30 Q28 34 24 34 Q20 34 16 30 Z", fill:"url(#glow"+rank+")" }),
      React.createElement("path", { d:"M16 13 Q18 11 22 12", stroke:c.shine, strokeWidth:"1.5", fill:"none", strokeLinecap:"round", opacity:"0.7" }),
      React.createElement("text", { x:"24", y:"25", textAnchor:"middle", fontSize:"10", fill:c.shadow, fontWeight:"bold" }, "*")
    )
  );
}

function Confetti({ active, tvTheme }) {
  var colors = ["#f59e0b","#60a5fa","#34d399","#f472b6","#a78bfa","#fb923c"];
  var isGalaxy = tvTheme === "galaxy";
  var isInferno = tvTheme === "inferno";
  var isGameday = tvTheme === "gameday";
  var isIce = tvTheme === "ice";
  if (!active) return null;

  if (isIce) {
    return (
      React.createElement("div", { style:{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"} },
        Array.from({length:8}).map(function(_,i) {
          var left = Math.random()*85;
          var delay = Math.random()*3;
          var dur = 4+Math.random()*3;
          var sz = 70+Math.random()*120;
          return React.createElement("div", { key:"berg"+i, style:{
            position:"absolute", left:left+"%", bottom:"-160px",
            fontSize:sz, animation:"iceRise "+dur+"s "+delay+"s ease-out forwards", opacity:0,
          }}, "\uD83C\uDFD4\uFE0F");
        }),
        Array.from({length:40}).map(function(_,i) {
          var left = Math.random()*100;
          var delay = Math.random()*4;
          var dur = 3+Math.random()*3;
          var sz = 20+Math.random()*40;
          var flakes = ["\u2744\uFE0F","\u2745","\u2746","\u2744\uFE0F","\u2C60"];
          return React.createElement("div", { key:"snow"+i, style:{
            position:"absolute", left:left+"%", top:"-60px",
            fontSize:sz, animation:"snowFall "+dur+"s "+delay+"s linear forwards", opacity:0,
          }}, flakes[i%flakes.length]);
        }),
        Array.from({length:6}).map(function(_,i) {
          var top = 10+Math.random()*80;
          var delay = Math.random()*3;
          var dur = 2+Math.random()*2;
          var fromLeft = i%2===0;
          return React.createElement("div", { key:"crystal"+i, style:{
            position:"absolute", top:top+"%",
            left:fromLeft?"-80px":undefined, right:fromLeft?undefined:"-80px",
            fontSize:50+Math.random()*40,
            animation:"crystalSlide"+(fromLeft?"L":"R")+" "+dur+"s "+delay+"s ease-out forwards", opacity:0,
          }}, "\uD83E\uDDCA");
        }),
        Array.from({length:20}).map(function(_,i) {
          var left = Math.random()*100;
          var delay = Math.random()*5;
          var dur = 2+Math.random()*2;
          return React.createElement("div", { key:"drop"+i, style:{
            position:"absolute", top:"-30px", left:left+"%",
            fontSize:24+Math.random()*20,
            animation:"snowFall "+dur+"s "+delay+"s linear forwards", opacity:0,
          }}, "\uD83D\uDCA7");
        }),
        React.createElement("style", null,
          "@keyframes iceRise{0%{transform:translateY(0) scale(0.5);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(-110vh) scale(1.3);opacity:0}}" +
          "@keyframes snowFall{0%{transform:translateY(0) rotate(0deg);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(110vh) rotate(360deg);opacity:0}}" +
          "@keyframes crystalSlideL{0%{transform:translateX(0) scale(0.3);opacity:0}20%{opacity:1}100%{transform:translateX(110vw) scale(1.2);opacity:0}}" +
          "@keyframes crystalSlideR{0%{transform:translateX(0) scale(0.3);opacity:0}20%{opacity:1}100%{transform:translateX(-110vw) scale(1.2);opacity:0}}"
        )
      )
    );
  }

  if (isGameday) {
    return (
      React.createElement("div", { style:{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"} },
        React.createElement("div", { style:{position:"absolute",left:"50%",top:"5%",transform:"translateX(-50%)",fontSize:"clamp(60px,12vw,140px)",animation:"goalPost 1s 0.2s ease-out forwards",opacity:0} }, "\uD83C\uDFDF\uFE0F"),
        React.createElement("div", { style:{position:"absolute",left:"20%",bottom:"20%",fontSize:"clamp(40px,7vw,90px)",animation:"footballKick 2s 0.5s cubic-bezier(.2,.8,.4,1) forwards",opacity:0} }, "\uD83C\uDFC8"),
        Array.from({length:60}).map(function(_,i) {
          var left = Math.random()*100;
          var delay = 0.8+Math.random()*2;
          var dur = 2+Math.random()*2;
          var cols = ["#1d4ed8","#dc2626","#ffffff","#fbbf24","#1d4ed8","#dc2626"];
          var color = cols[i%cols.length];
          var sz = 8+Math.random()*12;
          return React.createElement("div", { key:i, style:{position:"absolute",left:left+"%",top:"-20px",width:sz,height:sz,background:color,borderRadius:Math.random()>0.5?"50%":"2px",animation:"fall "+dur+"s "+delay+"s linear forwards"} });
        }),
        Array.from({length:12}).map(function(_,i) {
          var emotes = ["\uD83C\uDFC8","\uD83C\uDFC6","\uD83C\uDF89","\uD83D\uDC4F","\uD83D\uDD25","\uD83C\uDFC8","\uD83D\uDC4F","\uD83C\uDF89"];
          var emote = emotes[i%emotes.length];
          var top = 10+Math.random()*70;
          var delay = Math.random()*4;
          var dur = 3+Math.random()*3;
          var sz = 60+Math.random()*80;
          var fromRight = i%2===0;
          return React.createElement("div", { key:"emote"+i, style:{
            position:"absolute", top:top+"%",
            left:fromRight?"-120px":undefined, right:fromRight?undefined:"-120px",
            fontSize:sz,
            animation:"emoteFloat"+(fromRight?"L":"R")+" "+dur+"s "+delay+"s ease-in-out forwards",
            opacity:0,
          }}, emote);
        }),
        React.createElement("style", null,
          "@keyframes goalPost{0%{transform:translateX(-50%) scale(0.3);opacity:0}60%{transform:translateX(-50%) scale(1.2);opacity:1}100%{transform:translateX(-50%) scale(1);opacity:1}}" +
          "@keyframes footballKick{0%{transform:rotate(0deg) translate(0,0);opacity:1}40%{transform:rotate(-30deg) translate(80px,-40px);opacity:1}100%{transform:rotate(-45deg) translate(250px,-300px) scale(0.4);opacity:0}}" +
          "@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}"
        )
      )
    );
  }

  if (isInferno) {
    return (
      React.createElement("div", { style:{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"} },
        Array.from({length:12}).map(function(_,i) {
          var left = Math.random()*90;
          var delay = Math.random()*3;
          var dur = 3+Math.random()*3;
          var sz = 60+Math.random()*100;
          var cols = ["#ef4444","#f97316","#dc2626","#b45309","#fb923c"];
          var color = cols[i%cols.length];
          return React.createElement("div", { key:"lava"+i, style:{
            position:"absolute", left:left+"%", bottom:"-120px",
            width:sz, height:sz*1.3,
            background:"radial-gradient(ellipse at 40% 30%, "+color+"dd, #7c1d00)",
            borderRadius:"50% 50% 40% 40%",
            boxShadow:"0 0 30px "+color+"88, 0 0 60px "+color+"44",
            animation:"lavaRise "+dur+"s "+delay+"s ease-in forwards",
            opacity:0.9,
          } });
        }),
        Array.from({length:30}).map(function(_,i) {
          var left = Math.random()*100;
          var delay = Math.random()*2;
          var dur = 1+Math.random()*2;
          var sz = 8+Math.random()*16;
          return React.createElement("div", { key:"spark"+i, style:{
            position:"absolute", left:left+"%", bottom:"-20px",
            width:sz, height:sz*2,
            background:"linear-gradient(to top, #f97316, #fbbf24, transparent)",
            borderRadius:"50% 50% 20% 20%",
            animation:"sparkRise "+dur+"s "+delay+"s ease-out forwards",
          } });
        }),
        Array.from({length:15}).map(function(_,i) {
          var left = Math.random()*100;
          var delay = Math.random()*4;
          var dur = 2+Math.random()*2;
          return React.createElement("div", { key:"fire"+i, style:{
            position:"absolute", left:left+"%", bottom:"-40px",
            fontSize:24+Math.random()*24,
            animation:"sparkRise "+dur+"s "+delay+"s ease-out forwards",
          } }, "\uD83D\uDD25");
        }),
        React.createElement("style", null,
          "@keyframes lavaRise{0%{transform:translateY(0) scale(1) rotate(0deg);opacity:0.9}50%{transform:translateY(-50vh) scale(1.3) rotate(10deg);opacity:1}100%{transform:translateY(-120vh) scale(0.8) rotate(-5deg);opacity:0}}" +
          "@keyframes sparkRise{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-110vh) scale(0.3);opacity:0}}"
        )
      )
    );
  }

  if (isGalaxy) {
    return (
      React.createElement("div", { style:{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"} },
        Array.from({length:50}).map(function(_,i) {
          var left = Math.random()*100;
          var delay = Math.random()*3;
          var dur = 2+Math.random()*3;
          var sz = 16+Math.random()*20;
          var stars = ["\u2B50","\u2728","\u2B50","\u2B50","\u2728"];
          return React.createElement("div", { key:i, style:{position:"absolute",left:left+"%",top:"-40px",fontSize:sz,animation:"starFall "+dur+"s "+delay+"s linear forwards"} }, stars[i%stars.length]);
        }),
        Array.from({length:8}).map(function(_,i) {
          var left = 5+Math.random()*90;
          var delay = Math.random()*4;
          var dur = 2.5+Math.random()*2;
          var sz = 32+Math.random()*24;
          return React.createElement("div", { key:"r"+i, style:{position:"absolute",left:left+"%",bottom:"-80px",fontSize:sz,animation:"rocketLaunch "+dur+"s "+delay+"s ease-in forwards"} }, "\uD83D\uDE80");
        }),
        React.createElement("style", null, "@keyframes starFall{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(110vh) rotate(360deg) scale(0.3);opacity:0}} @keyframes rocketLaunch{0%{transform:translateY(0) rotate(-45deg) scale(1);opacity:1}100%{transform:translateY(-110vh) rotate(-45deg) scale(1.5);opacity:0}}")
      )
    );
  }

  return (
    React.createElement("div", { style:{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"} },
      Array.from({length:80}).map(function(_,i) {
        var left = Math.random()*100;
        var delay = Math.random()*2;
        var dur = 2+Math.random()*2;
        var color = colors[i%colors.length];
        var sz = 6+Math.random()*10;
        return React.createElement("div", { key:i, style:{position:"absolute",left:left+"%",top:"-20px",width:sz,height:sz,background:color,borderRadius:Math.random()>0.5?"50%":"2px",animation:"fall "+dur+"s "+delay+"s linear forwards"} });
      }),
      React.createElement("style", null, "@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}")
    )
  );
}

function CelebrationBanner({ celebration, tvTheme }) {
  if (!celebration) return null;
  var msg = celebration.type === "own_sale" ? "OWN SALE!" : celebration.type === "sold_transfer" ? "SENT CLOSED!" : celebration.type === "sold_qualified_transfer" ? "SENT Q CLOSED!" : celebration.type === "closed_qualified_transfer" ? "RECV Q CLOSED!" : "BADGE EARNED!";
  return (
    React.createElement("div", { style:{position:"fixed",inset:0,zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"} },
      React.createElement("div", { style:{textAlign:"center",animation:"celebIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards"} },
        React.createElement("div", { style:{fontSize:"clamp(28px,6vw,80px)",fontWeight:900,color:"#fbbf24",letterSpacing:4,marginBottom:16,textShadow:"0 0 40px #f59e0b,0 0 80px #f59e0b88",fontFamily:"'Trebuchet MS',sans-serif",textTransform:"uppercase"} }, msg),
        React.createElement("div", { style:{fontSize:"clamp(52px,13vw,160px)",fontWeight:900,color:"#ffffff",letterSpacing:2,textShadow:"0 0 80px #60a5fa,0 0 160px #3b82f688",fontFamily:"'Trebuchet MS',sans-serif",lineHeight:1.1} }, celebration.name),
        React.createElement("div", { style:{fontSize:"clamp(18px,3vw,40px)",color:"#94a3b8",marginTop:14,letterSpacing:3,fontFamily:"'Trebuchet MS',sans-serif"} }, "McDONALD GROUP")
      ),
      React.createElement("style", null, "@keyframes celebIn{0%{transform:scale(0.5) translateY(40px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}")
    )
  );
}

function LoginScreen({ agents, onLogin }) {
  var all = [...ADMIN_MANAGERS, ...agents].sort(function(a,b){ return a.name.localeCompare(b.name); });
  var [selId,setSelId] = useState("");
  var [pw,setPw]       = useState("");
  var [err,setErr]     = useState("");
  var [show,setShow]   = useState(false);

  function doLogin() {
    if (!selId) { setErr("Please select your name."); return; }
    var acct = all.find(function(a){ return String(a.id)===String(selId); });
    if (!acct) { setErr("Account not found."); return; }
    var correct = acct.isAdminManager ? MANAGER_PASSWORD : DEFAULT_PASSWORD;
    if (pw !== correct) { setErr("Incorrect password."); return; }
    onLogin(acct);
  }

  return (
    <div style={L.root}>
      <div style={L.bg}/>
      <div style={L.card}>
        <div style={L.eye}>McDONALD GROUP</div>
        <div style={L.ttl}>LEADERBOARD</div>
        <div style={L.sub}>Sign in to your account</div>
        <div style={L.field}>
          <label style={L.lbl}>YOUR NAME</label>
          <select value={selId} onChange={function(e){setSelId(e.target.value);setErr("");}} style={L.sel}>
            <option value="">-- Choose your name --</option>
            {all.map(function(a){ return <option key={a.id} value={a.id}>{a.name}</option>; })}
          </select>
        </div>
        <div style={L.field}>
          <label style={L.lbl}>PASSWORD</label>
          <div style={{display:"flex",gap:8}}>
            <input type={show?"text":"password"} value={pw}
              onChange={function(e){setPw(e.target.value);setErr("");}}
              onKeyDown={function(e){if(e.key==="Enter") doLogin();}}
              placeholder="Enter password" style={L.inp}/>
            <button onClick={function(){setShow(function(p){return !p;});}} style={L.eyeBtn}>{show?"\uD83D\uDE48":"\uD83D\uDC41\uFE0F"}</button>
          </div>
        </div>
        {err && <div style={L.err}>{err}</div>}
        <button onClick={doLogin} style={L.btn}>Sign In</button>
      </div>
    </div>
  );
}

var L = {
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
  eyeBtn:{padding:"0 12px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a0f1e",cursor:"pointer",fontSize:13,color:"#94a3b8"},
  err:{background:"#7f1d1d44",border:"1px solid #b91c1c",borderRadius:8,padding:"9px 14px",fontSize:13,color:"#fca5a5"},
  btn:{padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",letterSpacing:1,marginTop:4},
};

function ChangePwModal({ user, onClose }) {
  var [cur,setCur]   = useState("");
  var [nw,setNw]     = useState("");
  var [conf,setConf] = useState("");
  var [err,setErr]   = useState("");
  var [ok,setOk]     = useState(false);

  async function save() {
    var correct = user.isAdminManager ? MANAGER_PASSWORD : DEFAULT_PASSWORD;
    if (cur !== correct) { setErr("Current password is incorrect."); return; }
    if (nw.length < 6)   { setErr("New password must be at least 6 characters."); return; }
    if (nw !== conf)      { setErr("Passwords do not match."); return; }
    try {
      await setDoc(doc(db,"passwords",String(user.id)), { password:nw });
      setOk(true);
      setTimeout(onClose, 1500);
    } catch(e) { setErr("Failed to save. Try again."); }
  }

  return (
    <div style={{position:"fixed",inset:0,background:"#000a",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:16,padding:"28px",width:"100%",maxWidth:360}}>
        <div style={{fontSize:18,fontWeight:900,color:"#f1f5f9",marginBottom:20}}>Change Password</div>
        {ok ? <div style={{fontSize:15,color:"#34d399",textAlign:"center",padding:"20px 0"}}>Password updated!</div> : (
          <div>
            {[["Current Password",cur,setCur],["New Password",nw,setNw],["Confirm New Password",conf,setConf]].map(function(item){
              return (
                <div key={item[0]} style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                  <label style={L.lbl}>{item[0].toUpperCase()}</label>
                  <input type="password" value={item[1]} onChange={function(e){item[2](e.target.value);setErr("");}} style={{...L.inp,background:"#0f172a"}}/>
                </div>
              );
            })}
            {err && <div style={L.err}>{err}</div>}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={save} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",fontWeight:800,cursor:"pointer"}}>Save</button>
              <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontWeight:700}}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  var [agents,setAgents]           = useState(AGENTS_DEFAULT);
  var [stats,setStats]             = useState(function(){ return Object.fromEntries(AGENTS_DEFAULT.map(function(a){ return [a.id,initStats()]; })); });
  var [actLog,setActLog]           = useState([]);
  var [currentUser,setUser]        = useState(function(){ try { var u=localStorage.getItem("mgl-user"); return u?JSON.parse(u):null; } catch(e){ return null; } });
  var [view,setView]               = useState("board");
  var [flash,setFlash]             = useState(null);
  var [confetti,setConfetti]       = useState(false);
  var [celebration,setCelebration] = useState(null);
  var [loaded,setLoaded]           = useState(false);
  var [newName,setNewName]         = useState("");
  var [announcement,setAnn]        = useState("");
  var [editAnn,setEditAnn]         = useState(false);
  var [annDraft,setAnnDraft]       = useState("");
  var [prizes,setPrizes]           = useState({ gold:"", silver:"", bronze:"" });
  var [editPrize,setEditPrize]     = useState(false);
  var [prizeDraft,setPrizeDraft]   = useState({ gold:"", silver:"", bronze:"" });
  var [theme,setTheme]             = useState(function(){ try { return localStorage.getItem("mgl-theme")||"dark"; } catch(e){ return "dark"; } });
  var [tvTheme,setTvTheme]         = useState(function(){ try { return localStorage.getItem("mgl-tv-theme")||"midnight"; } catch(e){ return "midnight"; } });
  var [showPwModal,setShowPwModal] = useState(false);
  var [weekLabel,setWeekLabel]     = useState("");
  var [tvMode,setTvMode]           = useState(false);
  var [manualBadges,setManualBadges] = useState({});
  var [lockedEntryOrder,setLockedEntryOrder] = useState(null);

  function login(acct)  { setUser(acct); try { localStorage.setItem("mgl-user",JSON.stringify(acct)); } catch(e){} }
  function logout()     { setUser(null); try { localStorage.removeItem("mgl-user"); } catch(e){} setView("board"); }

  var isManager    = currentUser && currentUser.role === "Manager";
  var canSeePrizes = currentUser && PRIZE_RESTRICTED_IDS.indexOf(currentUser.id) === -1;
  var T            = theme==="dark" ? DARK : LIGHT;
  var TV           = TV_THEMES[tvTheme] || TV_THEMES.midnight;

  var todayStr = new Date().toDateString();

  function getTodayPoints(agentId) {
    return actLog
      .filter(function(e){ return e.agentId===agentId && new Date(e.time && e.time.toDate ? e.time.toDate() : e.time).toDateString()===todayStr; })
      .reduce(function(sum,e){ return sum+(POINT_VALUES[e.type]||0); }, 0);
  }

  function getWeeklyHospital(agentId) {
    return calcWeeklyHospital(actLog, agentId);
  }

  useEffect(function(){
    var unsub = onSnapshot(doc(db,"settings","celebrate"), function(snap){
      if(snap.exists() && snap.data().active){
        var d = snap.data();
        setConfetti(true);
        setCelebration({ name:d.by, type:d.type, badgeId:d.badgeId||null });
        setTimeout(function(){ setConfetti(false); setCelebration(null); }, 10000);
      }
    });
    return function(){ unsub(); };
  },[]);

  useEffect(function(){
    var unsub = onSnapshot(doc(db,"settings","celebrate"), function(snap){
      if(snap.exists() && snap.data().active && tvMode){
        try {
          var audio = new Audio("/champagneglass.mp3");
          audio.volume = 1.0;
          audio.play().catch(function(e){ console.log("Audio blocked:",e); });
        } catch(e){ console.log("Audio error:",e); }
      }
    });
    return function(){ unsub(); };
  },[tvMode]);

  useEffect(function(){
    var unsubSettings = onSnapshot(doc(db,"settings","main"), function(snap){
      if(snap.exists()){
        var d=snap.data();
        if(d.agents)                     setAgents(d.agents);
        if(d.stats)                      setStats(d.stats);
        if(d.announcement !== undefined) setAnn(d.announcement);
        if(d.prizes)                     setPrizes(d.prizes);
        if(d.weekLabel !== undefined)    setWeekLabel(d.weekLabel);
        if(d.manualBadges)               setManualBadges(d.manualBadges);
      }
      setLoaded(true);
    });
    var logQ = query(collection(db,"activityLog"), orderBy("time","desc"), limit(200));
    var unsubLog = onSnapshot(logQ, function(snap){
      setActLog(snap.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }));
    });
    return function(){ unsubSettings(); unsubLog(); };
  },[]);

  async function saveSettings(patch) {
    try { await setDoc(doc(db,"settings","main"), patch, { merge:true }); }
    catch(e){ console.error(e); }
  }

  function changeTheme(t)   { setTheme(t);   try { localStorage.setItem("mgl-theme",t); } catch(e){} }
  function changeTvTheme(t) { setTvTheme(t); try { localStorage.setItem("mgl-tv-theme",t); } catch(e){} }

  async function addActivity(agentId, type) {
    var agent    = agents.find(function(a){ return a.id===agentId; });
    var prev     = stats[agentId] || initStats();
    var prevPts  = calcPoints(prev);
    var prevTdp  = getTodayPoints(agentId);
    var newStat  = Object.assign({}, prev);
    newStat[type] = (prev[type]||0)+1;
    var newPts   = calcPoints(newStat);
    var newTdp   = prevTdp + (POINT_VALUES[type]||0);
    var newStats = Object.assign({}, stats);
    newStats[agentId] = newStat;
    setStats(newStats);
    setFlash({ agentId:agentId, type:type });
    setTimeout(function(){ setFlash(null); }, 1200);
    await saveSettings({ stats: newStats });
    await addDoc(collection(db,"activityLog"),{
      time:serverTimestamp(), agentId:agentId, agentName:agent&&agent.name, type:type, by:currentUser.name
    });
    var shouldCelebrate = type==="sold_transfer" || type==="sold_qualified_transfer" || type==="closed_qualified_transfer" || type==="own_sale" || type==="hospital_sale";
    var milestone = BADGES.find(function(b){ return b.condition(newStat,newPts,newTdp,getWeeklyHospital(agentId)) && !b.condition(prev,prevPts,prevTdp,getWeeklyHospital(agentId)); });
    if(shouldCelebrate || milestone){
      var celebType = shouldCelebrate ? type : "badge";
      await setDoc(doc(db,"settings","celebrate"),{ active:true, by:agent&&agent.name, type:celebType, badgeId:milestone?milestone.id:null, time:Date.now() });
      setTimeout(async function(){ await setDoc(doc(db,"settings","celebrate"),{ active:false }); }, 11000);
    }
  }

  async function removeActivity(agentId, type) {
    var prev     = stats[agentId] || initStats();
    var newStat  = Object.assign({}, prev);
    newStat[type] = Math.max(0,(prev[type]||0)-1);
    var newStats = Object.assign({}, stats);
    newStats[agentId] = newStat;
    setStats(newStats);
    await saveSettings({ stats: newStats });
    try {
      var match = actLog.find(function(e){ return e.agentId === agentId && e.type === type; });
      if(match && match.id) {
        await deleteDoc(doc(db,"activityLog", match.id));
      }
    } catch(e){ console.error(e); }
  }

  async function addAgent() {
    if(!newName.trim()) return;
    var id       = Date.now();
    var newAgents= [...agents, {id:id, name:newName.trim(), role:"Agent"}];
    var newStats = Object.assign({}, stats);
    newStats[id] = initStats();
    setAgents(newAgents); setStats(newStats); setNewName("");
    await saveSettings({ agents:newAgents, stats:newStats });
  }

  async function removeAgent(id) {
    var newAgents = agents.filter(function(a){ return a.id!==id; });
    setAgents(newAgents);
    await saveSettings({ agents:newAgents });
  }

  async function resetAll() {
    if(!window.confirm("Reset all points? This cannot be undone.")) return;
    var newStats = Object.fromEntries(agents.map(function(a){ return [a.id,initStats()]; }));
    setStats(newStats);
    await saveSettings({ stats:newStats });
  }

  async function resetActivityLog() {
    if(!window.confirm("Clear the entire activity log? This cannot be undone.")) return;
    try {
      var logQ = query(collection(db,"activityLog"), limit(200));
      var snap = await getDocs(logQ);
      await Promise.all(snap.docs.map(function(d){ return deleteDoc(d.ref); }));
      setActLog([]);
    } catch(e){ console.error(e); }
  }


  // Returns merged set of auto-earned + manually awarded badge IDs for an agent
  function getAgentBadgeIds(agent) {
    var autoBadges = BADGES
      .filter(function(b){ return b.condition(agent.stats, agent.points, getTodayPoints(agent.id), getWeeklyHospital(agent.id)); })
      .map(function(b){ return b.id; });
    var manual = (manualBadges[String(agent.id)] || []);
    var merged = autoBadges.slice();
    manual.forEach(function(id){ if(merged.indexOf(id)===-1) merged.push(id); });
    return merged;
  }

  async function toggleManualBadge(agentId, badgeId) {
    var current = (manualBadges[String(agentId)] || []).slice();
    var idx = current.indexOf(badgeId);
    if(idx === -1) { current.push(badgeId); } else { current.splice(idx, 1); }
    var newManual = Object.assign({}, manualBadges);
    newManual[String(agentId)] = current;
    setManualBadges(newManual);
    await saveSettings({ manualBadges: newManual });
  }

  var ranked = [...agents]
    .map(function(a){ return Object.assign({},a,{stats:stats[a.id]||initStats()}); })
    .map(function(a){ return Object.assign({},a,{points:calcPoints(a.stats),apps:calcApps(a.stats)}); })
    .sort(function(a,b){ return b.points-a.points; });

  var totPts      = ranked.reduce(function(s,a){ return s+a.points; }, 0);
  var totApps     = ranked.reduce(function(s,a){ return s+a.apps; }, 0);
  var totTrans    = ranked.reduce(function(s,a){ return s+a.stats.transfer+(a.stats.qualified_transfer||0); }, 0);
  var totWeekApps = ranked.reduce(function(s,a){ return s + calcWeeklyReceivedTransfersClosed(actLog,a.id) + calcWeeklyReceivedQualifiedTransfersClosed(actLog,a.id) + calcWeeklyOwnSales(actLog,a.id); }, 0);
  var totWeekHips = ranked.reduce(function(s,a){ return s + calcWeeklyHospital(actLog,a.id); }, 0);

  var actTypes = [
    {type:"transfer",                  label:"Transfer",                        color:"#3b82f6", pts:1},
    {type:"qualified_transfer",        label:"Qualified Transfer",              color:"#06b6d4", pts:2},
    {type:"sold_transfer",             label:"Sent Transfer Closed",            color:"#8b5cf6", pts:1},
    {type:"sold_qualified_transfer",   label:"Sent Qualified Transfer Closed",  color:"#a855f7", pts:1},
    {type:"closed_transfer",           label:"Received Transfer Closed",        color:"#f59e0b", pts:3},
    {type:"closed_qualified_transfer", label:"Received Qualified Transfer Closed", color:"#f97316", pts:2},
    {type:"own_sale",                  label:"Own Sale",                        color:"#10b981", pts:3},
    {type:"hospital_sale",             label:"Hospital Indemnity",              color:"#ec4899", pts:3},
    {type:"rewrite",                   label:"ReWrite",                         color:"#e11d48", pts:1.5},
  ];

  function fmtTime(ts) {
    var d = new Date(ts && ts.toDate ? ts.toDate() : ts);
    return d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }
  function typeLabel(t) { var f=actTypes.find(function(a){ return a.type===t; }); return f?f.label:t; }
  function typeColor(t) { var f=actTypes.find(function(a){ return a.type===t; }); return f?f.color:"#fff"; }

  var entryAgentsSorted = isManager
    ? (lockedEntryOrder
        ? lockedEntryOrder.map(function(id){ return ranked.find(function(a){ return a.id===id; }); }).filter(Boolean)
        : ranked)
    : ranked.filter(function(a){ return currentUser && a.id===currentUser.id; });
  var entryAgents = entryAgentsSorted;
  var navItems    = ["board","entry","stats"].concat(isManager?["feed","manage"]:[]);
  var myData      = ranked.find(function(a){ return a.id===(currentUser&&currentUser.id); });
  var myRank      = myData ? ranked.indexOf(myData)+1 : null;
  var weeklyVerse = getWeeklyVerse();

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",color:"#60a5fa",fontSize:18,fontWeight:700,fontFamily:"'Trebuchet MS',sans-serif"}}>
      Loading McDonald Group Leaderboard...
    </div>
  );

  if(!currentUser) return <LoginScreen agents={agents} onLogin={login}/>;

  return (
    <div style={{...S.root,background:T.bg,color:T.text}}>
      <Confetti active={confetti} tvTheme={tvTheme}/>
      <CelebrationBanner celebration={celebration} tvTheme={tvTheme}/>
      {showPwModal && <ChangePwModal user={currentUser} onClose={function(){setShowPwModal(false);}}/>}

      {/* TV MODE */}
      {tvMode && (
        <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",padding:"24px 40px",overflow:"hidden",background:TV.animated?undefined:TV.bg,backgroundImage:TV.animated?TV.animBg:undefined,backgroundSize:TV.animated?"400% 400%":undefined,animation:TV.animated?"tvAnim 8s ease infinite":undefined}}>
          {TV.animated && <style>{TV.animStyle}</style>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontSize:13,letterSpacing:6,color:TV.accent,fontWeight:700}}>McDONALD GROUP</div>
              <div style={{fontSize:32,fontWeight:900,background:tvTheme==="day"?"linear-gradient(135deg,#b45309,#d97706,#0f172a)":"linear-gradient(135deg,#f59e0b,#fbbf24,#fff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:3}}>LEADERBOARD</div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              {[{label:"TRANSFERS",value:totTrans},{label:"APPS",value:totWeekApps},{label:"HIPS",value:totWeekHips}].map(function(s){
                return (
                  <div key={s.label} style={{flex:"1 1 140px",minWidth:140,textAlign:"center",background:TV.card,border:"1px solid "+TV.border,borderRadius:12,padding:"10px 24px"}}>
                    <div style={{fontSize:28,fontWeight:900,color:"#f59e0b",lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:10,letterSpacing:2,color:TV.muted,marginTop:4,fontWeight:700}}>{s.label}</div>
                  </div>
                );
              })}
              <select value={tvTheme} onChange={function(e){ changeTvTheme(e.target.value); }}
                style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+TV.border,background:TV.card,color:TV.text,fontSize:12,cursor:"pointer",outline:"none"}}>
                {Object.entries(TV_THEMES).map(function(entry){ return <option key={entry[0]} value={entry[0]}>{entry[1].label}</option>; })}
              </select>
              <button onClick={function(){ setTvMode(false); }} style={{padding:"8px 16px",borderRadius:8,border:"1px solid "+TV.border,background:"transparent",color:TV.muted,cursor:"pointer",fontSize:13,fontWeight:700}}>Exit</button>
            </div>
          </div>

          {/* Bible Verse */}
          <div style={{textAlign:"center",marginBottom:8,padding:"8px 32px",background:TV.card,border:"1px solid "+TV.border,borderRadius:14,opacity:0.9}}>
            <div style={{fontSize:"clamp(12px,1.2vw,15px)",color:TV.accent,fontWeight:700,letterSpacing:2,marginBottom:3}}>VERSE OF THE WEEK</div>
            <div style={{fontSize:"clamp(18px,2.4vw,34px)",color:TV.text,fontStyle:"italic",lineHeight:1.35,maxWidth:"100%",margin:"0 auto"}}>"{weeklyVerse.text}"</div>
            <div style={{fontSize:"clamp(14px,1.6vw,23px)",color:TV.muted,fontWeight:700,marginTop:3,letterSpacing:1}}>-- {weeklyVerse.ref}</div>
          </div>

          {canSeePrizes && (prizes.gold||prizes.silver||prizes.bronze) && (
            <div style={{display:"flex",gap:16,marginBottom:12,justifyContent:"center"}}>
              {prizes.gold   && <span style={{fontSize:15,fontWeight:700,color:TV.text,background:TV.card,border:"1px solid "+TV.border,padding:"5px 16px",borderRadius:20}}>1st: {prizes.gold}</span>}
              {prizes.silver && <span style={{fontSize:15,fontWeight:700,color:TV.text,background:TV.card,border:"1px solid "+TV.border,padding:"5px 16px",borderRadius:20}}>2nd: {prizes.silver}</span>}
              {prizes.bronze && <span style={{fontSize:15,fontWeight:700,color:TV.text,background:TV.card,border:"1px solid "+TV.border,padding:"5px 16px",borderRadius:20}}>3rd: {prizes.bronze}</span>}
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:7,flex:1,overflowY:"auto"}}>
            {ranked.map(function(agent,idx){
              var maxPts=ranked[0]?ranked[0].points||1:1;
              var pct=maxPts>0?(agent.points/maxPts)*100:0;
              var isTop3=idx<3;
              var tc=isTop3?TV.top3[idx]:null;
              var agentBadgeIds=getAgentBadgeIds(agent); var agentBadges=BADGES.filter(function(b){ return agentBadgeIds.indexOf(b.id)!==-1; });
              var tvShowTracker = APP_TRACKER_IDS.indexOf(agent.id) !== -1;
              var tvTrackerApps = tvShowTracker ? (calcWeeklyQualifiedTransfers(actLog,agent.id) + calcWeeklyReceivedTransfersClosed(actLog,agent.id) + calcWeeklyOwnSales(actLog,agent.id) + calcWeeklyHospital(actLog,agent.id)) : 0;
              var tvUntilMin    = Math.max(0, APP_TARGET_MIN - tvTrackerApps);
              var tvUntilFriday = Math.max(0, APP_TARGET_FRIDAY - tvTrackerApps);
              var tvTotalApps   = calcWeeklyOwnSales(actLog,agent.id) + calcWeeklyHospital(actLog,agent.id) + calcWeeklyReceivedQualifiedTransfersClosed(actLog,agent.id) + calcWeeklyReceivedTransfersClosed(actLog,agent.id) + calcWeeklySentQualifiedTransfersClosed(actLog,agent.id);
              return (
                <div key={agent.id} style={{display:"flex",alignItems:"center",gap:20,borderRadius:14,padding:"12px 24px",background:isTop3?tc.bg:TV.card,border:isTop3?"1px solid "+tc.border:"1px solid "+TV.border,boxShadow:isTop3?"0 0 24px "+tc.glow:"none"}}>
                  <div style={{width:70,textAlign:"center",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    {isTop3 ? (
                      <div>
                        <Trophy rank={idx} size={48} colors={tc}/>
                        <div style={{fontSize:10,fontWeight:900,letterSpacing:1,color:tc.cup}}>{tc.label}</div>
                      </div>
                    ) : (
                      <span style={{fontSize:24,fontWeight:900,color:TV.muted}}>{idx+1}</span>
                    )}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"clamp(18px,2vw,26px)",fontWeight:900,color:isTop3?tc.shine:TV.text,display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                      {agent.name}
                      {agentBadges.map(function(b){
                        return <span key={b.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:20,background:TV.card,border:"1px solid #f59e0b66",color:"#fbbf24"}}>{b.icon} {b.label}</span>;
                      })}
                    </div>
                    <div style={{height:7,background:TV.border,borderRadius:4,overflow:"hidden",marginBottom:7}}>
                      <div style={{height:"100%",borderRadius:4,width:pct+"%",transition:"width .6s cubic-bezier(.4,0,.2,1)",background:isTop3?"linear-gradient(90deg,"+tc.cup+","+tc.shine+")":"linear-gradient(90deg,"+TV.accent+","+TV.muted+")"}}/>
                    </div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      {[
                        { label:"Transfer",       value:calcWeeklyTransfers(actLog,agent.id),                        color:"#3b82f6" },
                        { label:"Qualified Transfer",  value:calcWeeklyQualifiedTransfers(actLog,agent.id),               color:"#06b6d4" },
                        { label:"Sent Closed",    value:calcWeeklySentTransfersClosed(actLog,agent.id),              color:"#8b5cf6" },
                        { label:"Sent QT Closed",  value:calcWeeklySentQualifiedTransfersClosed(actLog,agent.id),     color:"#a855f7" },
                        { label:"Received T Closed",    value:calcWeeklyReceivedTransfersClosed(actLog,agent.id),          color:"#f59e0b" },
                        { label:"Received QT Closed",  value:calcWeeklyReceivedQualifiedTransfersClosed(actLog,agent.id), color:"#f97316" },
                        { label:"Own Sales",       value:calcWeeklyOwnSales(actLog,agent.id),                         color:"#34d399" },
                        { label:"HIP Sales",      value:calcWeeklyHospital(actLog,agent.id),                         color:"#ec4899" },
                        { label:"ReWrite",        value:agent.stats.rewrite||0,                                      color:"#e11d48" },
                      ].map(function(stat){
                        return (
                          <div key={stat.label} style={{display:"inline-flex",alignItems:"center",gap:7,padding:"6px 16px",borderRadius:20,border:"1px solid "+stat.color+"77",background:stat.color+"25"}}>
                            <span style={{fontSize:"clamp(18px,2vw,26px)",fontWeight:900,color:stat.color,lineHeight:1}}>{stat.value}</span>
                            <span style={{fontSize:"clamp(11px,1.1vw,15px)",fontWeight:700,color:TV.muted}}>{stat.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderLeft:"1px solid "+TV.border,paddingLeft:16,minWidth:80,textAlign:"center"}}>
                    <div style={{fontSize:"clamp(28px,3vw,42px)",fontWeight:900,lineHeight:1,color:isTop3?tc.cup:TV.accent}}>{tvTotalApps}</div>
                    <div style={{fontSize:"clamp(9px,0.85vw,11px)",letterSpacing:1,fontWeight:700,color:TV.muted,marginTop:3}}>APPS</div>
                  </div>
                  {tvShowTracker && (
                    <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,alignSelf:"flex-start",borderLeft:"1px solid "+TV.border,paddingLeft:16,minWidth:170}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"clamp(8px,0.8vw,10px)",letterSpacing:1,fontWeight:700,color:TV.muted,marginBottom:2}}>MINIMUM</div>
                        <div style={{display:"flex",alignItems:"baseline",gap:5,justifyContent:"flex-end"}}>
                          <span style={{fontSize:"clamp(22px,2.4vw,32px)",fontWeight:900,lineHeight:1,color:tvUntilMin===0?"#34d399":"#f59e0b"}}>{tvUntilMin===0?"✓":tvUntilMin}</span>
                          {tvUntilMin > 0 && <span style={{fontSize:"clamp(10px,0.9vw,12px)",color:TV.muted,fontWeight:600}}>to go</span>}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"clamp(8px,0.8vw,10px)",letterSpacing:1,fontWeight:700,color:TV.muted,marginBottom:2}}>FRIDAY PAID OFF</div>
                        <div style={{display:"flex",alignItems:"baseline",gap:5,justifyContent:"flex-end"}}>
                          <span style={{fontSize:"clamp(22px,2.4vw,32px)",fontWeight:900,lineHeight:1,color:tvUntilFriday===0?"#34d399":"#60a5fa"}}>{tvUntilFriday===0?"✓":tvUntilFriday}</span>
                          {tvUntilFriday > 0 && <span style={{fontSize:"clamp(10px,0.9vw,12px)",color:TV.muted,fontWeight:600}}>to go</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT */}
      {(announcement||isManager) && (
        <div style={{...S.banner,background:T.bannerBg,borderBottom:"1px solid "+T.border}}>
          {editAnn ? (
            <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
              <input value={annDraft} onChange={function(e){setAnnDraft(e.target.value);}} placeholder="Type announcement..."
                style={{...S.inlineInput,background:T.cardBg,color:T.text,border:"1px solid "+T.border}}/>
              <button onClick={async function(){setAnn(annDraft);setEditAnn(false);await saveSettings({announcement:annDraft});}} style={S.saveBtn}>Save</button>
              <button onClick={function(){setEditAnn(false);}} style={S.cancelBtn}>Cancel</button>
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"center",flex:1,gap:12}}>
              <span style={{fontSize:13,color:"#fbbf24",flex:1}}>{announcement||"No announcement set."}</span>
              {isManager && <button onClick={function(){setAnnDraft(announcement);setEditAnn(true);}} style={S.editAnnBtn}>Edit</button>}
            </div>
          )}
        </div>
      )}

      {/* HEADER */}
      <div style={{...S.header,background:T.headerBg,borderBottom:"1px solid "+T.border}}>
        <div>
          <div style={{fontSize:11,letterSpacing:4,color:"#60a5fa",fontWeight:700,marginBottom:2}}>McDONALD GROUP</div>
          <div style={S.title}>LEADERBOARD</div>
        </div>
        <div style={S.headerRight}>
          <div style={S.headerNav}>
            {navItems.map(function(v){
              var active = view===v;
              return (
                <button key={v} onClick={function(){ setView(v); if(v==="entry"){ setLockedEntryOrder(ranked.map(function(a){ return a.id; })); } else { setLockedEntryOrder(null); } }}
                  style={{...S.navBtn,border:"1px solid "+(active?"#3b82f6":T.border),color:active?"#f1f5f9":T.muted,background:active?"#1e3a5f":"transparent"}}>
                  {v==="board"?"Board":v==="entry"?"Log":v==="stats"?"Stats":v==="alltime"?"All Time":v==="feed"?"Feed":"Manage"}
                </button>
              );
            })}
            <button onClick={function(){changeTheme(theme==="dark"?"light":"dark");}}
              style={{...S.navBtn,border:"1px solid "+T.border,color:T.muted}}>
              {theme==="dark"?"Light":"Dark"}
            </button>
            {isManager && (
              <button onClick={function(){setTvMode(function(v){return !v;});}}
                style={{...S.navBtn,border:"1px solid "+(tvMode?"#f59e0b":T.border),color:tvMode?"#f59e0b":T.muted}}>
                {tvMode?"Exit TV":"TV Mode"}
              </button>
            )}
          </div>
          <div style={{...S.userBadge,background:T.cardBg,border:"1px solid "+T.border}}>
            <div style={S.userIcon}>{currentUser.name[0]}</div>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{currentUser.name}</span>
            {isManager && <span style={S.mgrTag}>MGR</span>}
            <button onClick={function(){setShowPwModal(true);}} style={{...S.signOutBtn,color:T.muted,border:"1px solid "+T.border}}>PW</button>
            <button onClick={logout} style={{...S.signOutBtn,color:T.muted,border:"1px solid "+T.border}}>Sign out</button>
          </div>
        </div>
      </div>

      {/* PRIZES */}
      {canSeePrizes && (prizes.gold||prizes.silver||prizes.bronze||isManager) && (
        <div style={{...S.prizeBanner,background:T.cardBg,borderBottom:"1px solid "+T.border}}>
          {editPrize ? (
            <div style={{display:"flex",gap:10,flex:1,flexWrap:"wrap",alignItems:"center"}}>
              {["gold","silver","bronze"].map(function(p){
                return (
                  <input key={p} value={prizeDraft[p]} onChange={function(e){setPrizeDraft(function(d){ var n=Object.assign({},d); n[p]=e.target.value; return n; });}}
                    placeholder={p.charAt(0).toUpperCase()+p.slice(1)+" prize..."}
                    style={{...S.inlineInput,flex:1,minWidth:120,background:T.cardBg,color:T.text,border:"1px solid "+T.border}}/>
                );
              })}
              <button onClick={async function(){setPrizes(prizeDraft);setEditPrize(false);await saveSettings({prizes:prizeDraft});}} style={S.saveBtn}>Save</button>
              <button onClick={function(){setEditPrize(false);}} style={S.cancelBtn}>Cancel</button>
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",flex:1}}>
              <span style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:2}}>{weekLabel||"THIS WEEK'S PRIZES"}</span>
              {prizes.gold   && <span style={S.prizeItem}>1st: {prizes.gold}</span>}
              {prizes.silver && <span style={S.prizeItem}>2nd: {prizes.silver}</span>}
              {prizes.bronze && <span style={S.prizeItem}>3rd: {prizes.bronze}</span>}
              {isManager && (
                <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center"}}>
                  <input value={weekLabel} onChange={function(e){setWeekLabel(e.target.value);}}
                    onBlur={async function(){await saveSettings({weekLabel:weekLabel});}}
                    placeholder="Week label..." style={{...S.inlineInput,width:140,background:T.cardBg,color:T.text,border:"1px solid "+T.border}}/>
                  <button onClick={function(){setPrizeDraft(prizes);setEditPrize(true);}} style={S.editAnnBtn}>Edit Prizes</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STATS BAR */}
      <div style={{display:"flex",gap:12,padding:"14px 24px",flexWrap:"wrap"}}>
        {[{label:"TRANSFERS",value:totTrans},{label:"APPS",value:totWeekApps},{label:"HIPS",value:totWeekHips}].map(function(s){
          return (
            <div key={s.label} style={{flex:"1 1 140px",minWidth:140,background:T.cardBg,border:"1px solid "+T.border,borderRadius:10,padding:"10px 18px",textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:900,color:"#f59e0b",lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:10,letterSpacing:2,color:T.muted,marginTop:4,fontWeight:700}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* BOARD */}
      {view==="board" && (
        <div style={S.content}>
          <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
            {[{label:"Transfer",pts:1,color:"#3b82f6"},{label:"Qualified Transfer",pts:2,color:"#06b6d4"},{label:"Sent Transfer Closed",pts:1,color:"#8b5cf6"},{label:"Sent Qualified Transfer Closed",pts:1,color:"#a855f7"},{label:"Received Transfer Closed",pts:3,color:"#f59e0b"},{label:"Received Qualified Transfer Closed",pts:2,color:"#f97316"},{label:"Own Sale",pts:3,color:"#34d399"},{label:"Hospital Indemnity",pts:3,color:"#ec4899"},{label:"ReWrite",pts:1.5,color:"#e11d48"}].map(function(item){
              return (
                <div key={item.label} style={{display:"flex",alignItems:"center",gap:6,background:T.cardBg,border:"1px solid "+T.border,borderRadius:20,padding:"5px 12px"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:item.color}}/>
                  <span style={{fontSize:12,color:T.muted}}>{item.label}</span>
                  <span style={{fontSize:12,fontWeight:800,color:item.color}}>+{item.pts} pts</span>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {ranked.map(function(agent,idx){
              var isMe=agent.id===currentUser.id;
              var isFlash=flash&&flash.agentId===agent.id;
              var maxPts=ranked[0]?ranked[0].points||1:1;
              var pct=maxPts>0?(agent.points/maxPts)*100:0;
              var tc=TROPHY_COLORS[theme][idx];
              var isTop3=idx<3;
              var agentBadgeIds=getAgentBadgeIds(agent); var agentBadges=BADGES.filter(function(b){ return agentBadgeIds.indexOf(b.id)!==-1; });
              var agentTotalApps = calcWeeklyOwnSales(actLog,agent.id) + calcWeeklyHospital(actLog,agent.id) + calcWeeklyReceivedQualifiedTransfersClosed(actLog,agent.id) + calcWeeklyReceivedTransfersClosed(actLog,agent.id) + calcWeeklySentQualifiedTransfersClosed(actLog,agent.id);
              var showTracker = APP_TRACKER_IDS.indexOf(agent.id) !== -1;
              var trackerApps = showTracker ? (calcWeeklyQualifiedTransfers(actLog,agent.id) + calcWeeklyReceivedTransfersClosed(actLog,agent.id) + calcWeeklyOwnSales(actLog,agent.id) + calcWeeklyHospital(actLog,agent.id)) : 0;
              var untilMin    = Math.max(0, APP_TARGET_MIN - trackerApps);
              var untilFriday = Math.max(0, APP_TARGET_FRIDAY - trackerApps);
              var rowStyle = {
                display:"flex",alignItems:"center",gap:16,borderRadius:12,padding:"14px 18px",transition:"all .3s",
                background:isTop3?tc.bg:T.cardBg,
                border:isTop3?"1px solid "+tc.border:isMe?"1px solid #2563eb66":"1px solid "+T.border,
                boxShadow:isTop3?"0 0 18px "+tc.glow:isMe?"0 0 14px #2563eb33":"none",
              };
              if(isFlash){ rowStyle.background="#1a3a1a"; rowStyle.border="1px solid #34d399"; }
              return (
                <div key={agent.id} style={rowStyle}>
                  <div style={{width:52,textAlign:"center",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    {isTop3 ? (
                      <div>
                        <Trophy rank={idx} size={44}/>
                        <div style={{fontSize:9,fontWeight:900,letterSpacing:1,color:tc.cup}}>{tc.label}</div>
                      </div>
                    ) : (
                      <span style={{fontSize:18,fontWeight:900,color:T.muted}}>{idx+1}</span>
                    )}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:16,fontWeight:800,color:isTop3?tc.shine:T.text,display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                      {agent.name}
                      {agent.role==="Manager"&&isManager&&<span style={S.mgrTag}>MGR</span>}
                      {isMe&&<span style={S.meBadge}>YOU</span>}
                      {agentBadges.map(function(b){
                        return <span key={b.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:theme==="dark"?"#1e293b":"#f1f5f9",border:"1px solid "+(theme==="dark"?"#f59e0b66":"#f59e0b99"),color:theme==="dark"?"#fbbf24":"#b45309",whiteSpace:"nowrap"}}>{b.icon} {b.label}</span>;
                      })}
                    </div>
                    <div style={{height:6,background:theme==="dark"?"#1e293b":"#e2e8f0",borderRadius:3,overflow:"hidden",marginBottom:7}}>
                      <div style={{height:"100%",borderRadius:3,width:pct+"%",transition:"width .6s cubic-bezier(.4,0,.2,1)",background:isTop3?"linear-gradient(90deg,"+tc.cup+","+tc.shine+")":"linear-gradient(90deg,#2563eb,#60a5fa)"}}/>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[
                        { label:"Transfer",       value:calcWeeklyTransfers(actLog,agent.id),                        color:"#3b82f6" },
                        { label:"Qualified Transfer",  value:calcWeeklyQualifiedTransfers(actLog,agent.id),               color:"#06b6d4" },
                        { label:"Sent Closed",    value:calcWeeklySentTransfersClosed(actLog,agent.id),              color:"#8b5cf6" },
                        { label:"Sent QT Closed",  value:calcWeeklySentQualifiedTransfersClosed(actLog,agent.id),     color:"#a855f7" },
                        { label:"Received T Closed",    value:calcWeeklyReceivedTransfersClosed(actLog,agent.id),          color:"#f59e0b" },
                        { label:"Received QT Closed",  value:calcWeeklyReceivedQualifiedTransfersClosed(actLog,agent.id), color:"#f97316" },
                        { label:"Own Sales",       value:calcWeeklyOwnSales(actLog,agent.id),                         color:"#34d399" },
                        { label:"HIP Sales",      value:calcWeeklyHospital(actLog,agent.id),                         color:"#ec4899" },
                        { label:"ReWrite",        value:agent.stats.rewrite||0,                                      color:"#e11d48" },
                      ].map(function(stat){
                        return (
                          <div key={stat.label} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:20,border:"1px solid "+stat.color+"66",background:stat.color+"20"}}>
                            <span style={{fontSize:18,fontWeight:900,color:stat.color,lineHeight:1}}>{stat.value}</span>
                            <span style={{fontSize:12,fontWeight:700,color:T.muted}}>{stat.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {showTracker && (
                    <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,borderLeft:"1px solid "+T.border,paddingLeft:14,minWidth:160}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:10,letterSpacing:1,fontWeight:700,color:T.muted,marginBottom:2}}>MINIMUM</div>
                        <div style={{display:"flex",alignItems:"baseline",gap:5,justifyContent:"flex-end"}}>
                          <span style={{fontSize:28,fontWeight:900,lineHeight:1,color:untilMin===0?"#34d399":"#f59e0b"}}>{untilMin===0?"✓":untilMin}</span>
                          {untilMin > 0 && <span style={{fontSize:11,color:T.muted,fontWeight:600}}>to go</span>}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:10,letterSpacing:1,fontWeight:700,color:T.muted,marginBottom:2}}>FRIDAY PAID OFF</div>
                        <div style={{display:"flex",alignItems:"baseline",gap:5,justifyContent:"flex-end"}}>
                          <span style={{fontSize:28,fontWeight:900,lineHeight:1,color:untilFriday===0?"#34d399":"#60a5fa"}}>{untilFriday===0?"✓":untilFriday}</span>
                          {untilFriday > 0 && <span style={{fontSize:11,color:T.muted,fontWeight:600}}>to go</span>}
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderLeft:"1px solid "+T.border,paddingLeft:14,minWidth:70,textAlign:"center"}}>
                    <div style={{fontSize:36,fontWeight:900,lineHeight:1,color:isTop3?tc.cup:"#60a5fa"}}>{agentTotalApps}</div>
                    <div style={{fontSize:10,letterSpacing:1,fontWeight:700,color:T.muted,marginTop:3}}>APPS</div>
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
            {entryAgents.map(function(agent){
              return (
                <div key={agent.id} style={{background:T.cardBg,border:"1px solid "+(agent.id===currentUser.id?"#2563eb66":T.border),boxShadow:agent.id===currentUser.id?"0 0 12px #2563eb22":"none",borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    {agent.name}{agent.id===currentUser.id&&<span style={S.meBadge}>YOU</span>}
                  </div>
                  <div style={{fontSize:12,color:"#f59e0b",fontWeight:700,marginBottom:12}}>{agent.points} pts</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                    {actTypes.map(function(act){
                      return (
                        <div key={act.type} style={{display:"flex",gap:6}}>
                          <button onClick={function(){addActivity(agent.id,act.type);}} style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",background:act.color}}>
                            +{act.pts} {act.label}
                          </button>
                          <button onClick={function(){removeActivity(agent.id,act.type);}} style={{padding:"7px 10px",borderRadius:7,border:"1px solid "+T.border,background:T.cardBg,color:T.muted,fontWeight:900,fontSize:14,cursor:"pointer"}}>-</button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",gap:8,fontSize:11,color:T.muted,flexWrap:"wrap"}}>
                    <span>{agent.stats.transfer} xfer</span>
                    {(agent.stats.qualified_transfer||0) > 0 && <span>{agent.stats.qualified_transfer} qual</span>}
                    <span>{agent.stats.sold_transfer} sent cls</span>
                    {(agent.stats.sold_qualified_transfer||0) > 0 && <span>{agent.stats.sold_qualified_transfer} sent q cls</span>}
                    <span>{agent.stats.closed_transfer} recv cls</span>
                    {(agent.stats.closed_qualified_transfer||0) > 0 && <span>{agent.stats.closed_qualified_transfer} recv q cls</span>}
                    <span>{agent.stats.own_sale} own</span>
                    {(agent.stats.hospital_sale||0) > 0 && <span>{agent.stats.hospital_sale} hosp</span>}
                    {(agent.stats.rewrite||0) > 0 && <span>{agent.stats.rewrite} rewrite</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATS */}
      {view==="stats" && (
        <div style={S.content}>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:20,letterSpacing:1}}>{myData?currentUser.name+"'s Stats":"Team Stats"}</div>
          {myData && (
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:28}}>
              {[{label:"Your Rank",value:"#"+myRank},{label:"Total Points",value:myData.points},{label:"Apps Written",value:myData.apps},{label:"Transfers",value:myData.stats.transfer}].map(function(s){
                return (
                  <div key={s.label} style={{flex:"1 1 100px",background:T.cardBg,border:"1px solid "+T.border,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                    <div style={{fontSize:26,fontWeight:900,color:"#60a5fa",lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:10,letterSpacing:2,color:T.muted,marginTop:4,fontWeight:700}}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          )}
          {myData && (
            <div style={{marginBottom:28}}>
              <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:12,letterSpacing:1}}>YOUR BADGES</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {BADGES.map(function(b){
                  var myBadgeIds=getAgentBadgeIds(myData); var earned=myBadgeIds.indexOf(b.id)!==-1;
                  return (
                    <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:20,background:T.cardBg,border:"1px solid "+(earned?"#f59e0b66":T.border),opacity:earned?1:0.35}}>
                      <span style={{fontSize:16}}>{b.icon}</span>
                      <span style={{fontSize:13,fontWeight:700,color:earned?"#fbbf24":T.muted}}>{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:12,letterSpacing:1}}>TEAM BREAKDOWN</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {ranked.map(function(agent,idx){
              return (
                <div key={agent.id} style={{display:"flex",alignItems:"center",gap:16,borderRadius:12,padding:"12px 16px",background:T.cardBg,border:"1px solid "+T.border}}>
                  <div style={{width:28,fontWeight:900,color:T.muted,fontSize:14}}>{idx+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:6}}>{agent.name}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {actTypes.map(function(at){
                        return (
                          <div key={at.type} style={{fontSize:11,padding:"3px 8px",borderRadius:10,background:at.color+"22",color:at.color,fontWeight:700}}>
                            {at.label.split(" ")[0]}: {agent.stats[at.type]||0}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <span style={{fontSize:24,fontWeight:900,color:"#60a5fa"}}>{agent.points}</span>
                    <span style={{fontSize:9,color:T.muted,letterSpacing:2}}>PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ALL TIME */}
      {view==="alltime" && (
        <div style={S.content}>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:20,letterSpacing:1}}>All Time Stats</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {ranked.map(function(agent,idx){
              return (
                <div key={agent.id} style={{display:"flex",alignItems:"center",gap:16,borderRadius:12,padding:"14px 18px",background:T.cardBg,border:"1px solid "+T.border}}>
                  <div style={{width:36,fontWeight:900,color:T.muted,fontSize:16,textAlign:"center"}}>{idx+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:8}}>{agent.name}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#3b82f622",color:"#60a5fa",fontWeight:700}}>{agent.stats.transfer} Transfers</div>
                      <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#8b5cf622",color:"#a78bfa",fontWeight:700}}>{agent.stats.sold_transfer} Sent Closed</div>
                      {(agent.stats.sold_qualified_transfer||0) > 0 && <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#a855f722",color:"#a855f7",fontWeight:700}}>{agent.stats.sold_qualified_transfer} Sent Q Closed</div>}
                      <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#f59e0b22",color:"#f59e0b",fontWeight:700}}>{agent.stats.closed_transfer} Recv Closed</div>
                      {(agent.stats.closed_qualified_transfer||0) > 0 && <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#f9741622",color:"#f97316",fontWeight:700}}>{agent.stats.closed_qualified_transfer} Recv Q Closed</div>}
                      {(agent.stats.qualified_transfer||0) > 0 && <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#06b6d422",color:"#06b6d4",fontWeight:700}}>{agent.stats.qualified_transfer} Qual Transfer</div>}
                      <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#10b98122",color:"#34d399",fontWeight:700}}>{agent.stats.own_sale} Own Sales</div>
                      {(agent.stats.hospital_sale||0) > 0 && <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#ec489922",color:"#ec4899",fontWeight:700}}>{agent.stats.hospital_sale} Hospital</div>}
                      {(agent.stats.rewrite||0) > 0 && <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#f9741622",color:"#f97316",fontWeight:700}}>{agent.stats.rewrite} ReWrite</div>}
                      <div style={{fontSize:12,padding:"4px 10px",borderRadius:10,background:"#34d39922",color:"#34d399",fontWeight:800}}>{agent.apps} Total Apps</div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                    <span style={{fontSize:28,fontWeight:900,color:"#60a5fa",lineHeight:1}}>{agent.points}</span>
                    <span style={{fontSize:10,color:T.muted,letterSpacing:2,fontWeight:700}}>PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FEED */}
      {view==="feed" && isManager && (
        <div style={S.content}>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:20,letterSpacing:1}}>Activity Feed</div>
          {actLog.length===0 && <div style={{color:T.muted,fontSize:14}}>No activity logged yet.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {actLog.slice(0,100).map(function(e,i){
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderRadius:10,background:T.cardBg,border:"1px solid "+T.border}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:typeColor(e.type),flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <span style={{fontWeight:800,color:T.text}}>{e.agentName}</span>
                    <span style={{color:T.muted,fontSize:13}}> - {typeLabel(e.type)}</span>
                    {e.by&&e.by!==e.agentName&&<span style={{color:T.muted,fontSize:12}}> (logged by {e.by})</span>}
                  </div>
                  <div style={{fontSize:11,color:T.muted}}>{fmtTime(e.time)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MANAGE */}
      {view==="manage" && isManager && (
        <div style={S.content}>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:16,letterSpacing:1}}>Manage Agents</div>

          {/* Agent list with badge assignment */}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
            {agents.map(function(a){
              var agentManual = manualBadges[String(a.id)] || [];
              var agentStats  = stats[a.id] || initStats();
              var agentPts    = calcPoints(agentStats);
              var agentData   = Object.assign({},a,{stats:agentStats,points:agentPts});
              return (
                <div key={a.id} style={{background:T.cardBg,border:"1px solid "+T.border,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <span style={{flex:1,fontSize:14,fontWeight:700,color:T.text}}>{a.name}</span>
                    <span style={{fontSize:12,color:T.muted}}>{a.role}</span>
                    <button onClick={function(){removeAgent(a.id);}} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:12,cursor:"pointer",fontWeight:600}}>Remove</button>
                  </div>
                  <div style={{fontSize:10,letterSpacing:2,color:T.muted,fontWeight:700,marginBottom:8}}>BADGES</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {BADGES.map(function(b){
                      var autoEarned = b.condition(agentStats, agentPts, getTodayPoints(a.id), getWeeklyHospital(a.id));
                      var manualOn   = agentManual.indexOf(b.id) !== -1;
                      var active     = autoEarned || manualOn;
                      return (
                        <button key={b.id} onClick={function(){ if(!autoEarned) toggleManualBadge(a.id, b.id); }}
                          title={autoEarned?"Auto-earned (cannot remove)":manualOn?"Click to remove":"Click to award"}
                          style={{
                            display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:20,
                            border:"1px solid "+(active?(autoEarned?"#f59e0b99":"#34d39999"):T.border),
                            background:active?(autoEarned?"#f59e0b18":"#34d39918"):"transparent",
                            color:active?(autoEarned?"#fbbf24":"#34d399"):T.muted,
                            fontSize:12,fontWeight:700,cursor:autoEarned?"default":"pointer",
                            opacity:active?1:0.5,
                          }}>
                          <span>{b.icon}</span>
                          <span>{b.label}</span>
                          {manualOn && !autoEarned && <span style={{fontSize:10,color:"#34d399"}}>★</span>}
                          {autoEarned && <span style={{fontSize:10,color:"#f59e0b"}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add agent */}
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input value={newName} onChange={function(e){setNewName(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter") addAgent();}}
              placeholder="New agent name..." style={{flex:1,padding:"10px 14px",borderRadius:8,border:"1px solid "+T.border,background:T.cardBg,color:T.text,fontSize:14,outline:"none"}}/>
            <button onClick={addAgent} style={{padding:"10px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Add Agent</button>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={resetAll} style={{padding:"10px 20px",borderRadius:8,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer"}}>Reset All Points</button>
            <button onClick={resetActivityLog} style={{padding:"10px 20px",borderRadius:8,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer"}}>Clear Activity Log</button>
          </div>
        </div>
      )}
    </div>
  );
}

var S = {
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