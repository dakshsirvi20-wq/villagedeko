// auth.js
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);

function showMessage(message, type = "error") {
  const box = $("authMessage");
  if (!box) return;
  box.textContent = message;
  box.className = `message ${type}`;
  box.classList.remove("hidden");
}

function clearMessage() {
  const box = $("authMessage");
  if (box) box.classList.add("hidden");
}

function setLoading(button, loading, text) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "Please wait..." : text;
}

let recaptchaVerifier = null;
let confirmationResult = null;

function getRecaptcha() {
  if (recaptchaVerifier) return recaptchaVerifier;

  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      recaptchaVerifier = null;
    }
  });

  return recaptchaVerifier;
}

function normalizePhone(value) {
  let phone = value.trim().replace(/[\s()-]/g, "");
  if (/^\d{10}$/.test(phone)) phone = "+91" + phone;
  return phone;
}

async function emailLogin() {
  clearMessage();

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    showMessage("Email aur password dono enter karein.");
    return;
  }

  const button = $("emailLoginBtn");
  setLoading(button, true, "Login");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace("index.html");
  } catch (error) {
    const code = error?.code || "";
    if (code === "auth/user-not-found") {
      showMessage("Account nahi mila. Pehle Create Account karein.");
    } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      showMessage("Email ya password galat hai.");
    } else if (code === "auth/invalid-email") {
      showMessage("Valid email address enter karein.");
    } else {
      showMessage(error.message || "Login failed.");
    }
  } finally {
    setLoading(button, false, "Login");
  }
}

async function createAccount() {
  clearMessage();

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    showMessage("Email aur password dono enter karein.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password kam se kam 6 characters ka hona chahiye.");
    return;
  }

  const button = $("createAccountBtn");
  setLoading(button, true, "Create Account");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.replace("index.html");
  } catch (error) {
    const code = error?.code || "";
    if (code === "auth/email-already-in-use") {
      showMessage("Ye email already registered hai. Login karein.");
    } else {
      showMessage(error.message || "Account create nahi hua.");
    }
  } finally {
    setLoading(button, false, "Create Account");
  }
}

async function sendOtp() {
  clearMessage();

  const phone = normalizePhone($("phone").value);

  if (!/^\+91\d{10}$/.test(phone)) {
    showMessage("Indian mobile number +91 ke saath enter karein, jaise +919876543210.");
    return;
  }

  const button = $("sendOtpBtn");
  setLoading(button, true, "Send OTP");

  try {
    const verifier = getRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);

    $("phoneBox").classList.add("hidden");
    $("otpBox").classList.remove("hidden");
    $("sendOtpBtn").classList.add("hidden");
    $("verifyOtpBtn").classList.remove("hidden");

    showMessage("OTP aapke phone par bhej diya gaya hai.", "success");
  } catch (error) {
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (_) {}
      recaptchaVerifier = null;
    }
    showMessage(error.message || "OTP send nahi hua.");
  } finally {
    setLoading(button, false, "Send OTP");
  }
}

async function verifyOtp() {
  clearMessage();

  const otp = $("otp").value.trim();

  if (!/^\d{6}$/.test(otp)) {
    showMessage("6 digit OTP enter karein.");
    return;
  }

  if (!confirmationResult) {
    showMessage("Pehle OTP send karein.");
    return;
  }

  const button = $("verifyOtpBtn");
  setLoading(button, true, "Verify OTP");

  try {
    await confirmationResult.confirm(otp);
    window.location.replace("index.html");
  } catch (error) {
    showMessage("OTP galat ya expire ho gaya hai.");
  } finally {
    setLoading(button, false, "Verify OTP");
  }
}

window.emailLogin = emailLogin;
window.createAccount = createAccount;
window.sendOtp = sendOtp;
window.verifyOtp = verifyOtp;

onAuthStateChanged(auth, (user) => {
  if (user && location.pathname.endsWith("login.html")) {
    window.location.replace("index.html");
  }
});
