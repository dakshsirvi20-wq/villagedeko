import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { auth } from "./firebase-config.js";


const $ = (id) => document.getElementById(id);

let recaptchaVerifier = null;
let confirmationResult = null;


// -------------------------
// MESSAGE
// -------------------------

function showMessage(text, type = "error") {

  const box = $("authMessage");

  if (!box) return;

  box.textContent = text;

  box.className = `message ${type}`;

  box.classList.remove("hidden");
}


function clearMessage() {

  const box = $("authMessage");

  if (box) {
    box.classList.add("hidden");
  }

}


// -------------------------
// LOADING
// -------------------------

function loading(id, yes, normalText) {

  const button = $(id);

  if (!button) return;

  button.disabled = yes;

  button.textContent =
    yes ? "Please wait..." : normalText;

}


// -------------------------
// EMAIL / PHONE TAB
// -------------------------

function switchMethod(method) {

  clearMessage();

  const emailMode = method === "email";

  $("emailPanel")
    .classList
    .toggle("hidden", !emailMode);

  $("phonePanel")
    .classList
    .toggle("hidden", emailMode);

  $("emailTab")
    .classList
    .toggle("active", emailMode);

  $("phoneTab")
    .classList
    .toggle("active", !emailMode);

}


// -------------------------
// EMAIL LOGIN
// -------------------------

async function emailLogin() {

  clearMessage();

  const email =
    $("email").value.trim();

  const password =
    $("password").value;


  if (!email || !password) {

    showMessage(
      "Email aur password dono enter karein."
    );

    return;
  }


  loading(
    "emailLoginBtn",
    true,
    "Login"
  );


  try {

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    location.replace("index.html");

  }

  catch (error) {

    console.error(error);

    if (
      error.code ===
      "auth/invalid-credential"
    ) {

      showMessage(
        "Email ya password galat hai."
      );

    } else {

      showMessage(
        error.message ||
        "Login failed."
      );

    }

  }

  finally {

    loading(
      "emailLoginBtn",
      false,
      "Login"
    );

  }

}


// -------------------------
// CREATE ACCOUNT
// -------------------------

async function createAccount() {

  clearMessage();

  const email =
    $("email").value.trim();

  const password =
    $("password").value;


  if (!email || !password) {

    showMessage(
      "Email aur password dono enter karein."
    );

    return;
  }


  if (password.length < 6) {

    showMessage(
      "Password kam se kam 6 characters ka hona chahiye."
    );

    return;
  }


  loading(
    "createAccountBtn",
    true,
    "Create Account"
  );


  try {

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    location.replace("index.html");

  }

  catch (error) {

    console.error(error);

    if (
      error.code ===
      "auth/email-already-in-use"
    ) {

      showMessage(
        "Ye email already registered hai. Login karein."
      );

    } else {

      showMessage(
        error.message ||
        "Account create nahi hua."
      );

    }

  }

  finally {

    loading(
      "createAccountBtn",
      false,
      "Create Account"
    );

  }

}


// -------------------------
// RECAPTCHA
// -------------------------

function getRecaptcha() {

  if (recaptchaVerifier) {

    return recaptchaVerifier;

  }


  recaptchaVerifier =
    new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",

        callback: () => {
          console.log(
            "reCAPTCHA solved"
          );
        },

        "expired-callback": () => {

          try {

            recaptchaVerifier.clear();

          } catch (_) {}

          recaptchaVerifier = null;

        }
      }
    );


  return recaptchaVerifier;

}


// -------------------------
// PHONE FORMAT
// -------------------------

function normalizeIndianPhone(value) {

  let phone =
    value
      .trim()
      .replace(/[^\d+]/g, "");


  if (/^\d{10}$/.test(phone)) {

    phone =
      "+91" + phone;

  }


  if (/^91\d{10}$/.test(phone)) {

    phone =
      "+" + phone;

  }


  return phone;

}


// -------------------------
// SEND OTP
// -------------------------

async function sendOtp() {

  clearMessage();

  const phone =
    normalizeIndianPhone(
      $("phone").value
    );


  if (!/^\+91\d{10}$/.test(phone)) {

    showMessage(
      "10 digit Indian mobile number enter karein."
    );

    return;
  }


  loading(
    "sendOtpBtn",
    true,
    "Send OTP"
  );


  try {

    const appVerifier =
      getRecaptcha();


    confirmationResult =
      await signInWithPhoneNumber(
        auth,
        phone,
        appVerifier
      );


    $("phone").value = phone;


    $("phoneInputBox")
      .classList
      .add("hidden");


    $("otpBox")
      .classList
      .remove("hidden");


    $("sendOtpBtn")
      .classList
      .add("hidden");


    $("verifyOtpBtn")
      .classList
      .remove("hidden");


    $("changePhoneBtn")
      .classList
      .remove("hidden");


    showMessage(
      "OTP SMS se bhej diya gaya hai.",
      "success"
    );

  }

  catch (error) {

    console.error(error);


    try {

      recaptchaVerifier?.clear();

    } catch (_) {}


    recaptchaVerifier = null;


    if (
      error.code ===
      "auth/operation-not-allowed"
    ) {

      showMessage(
        "Firebase mein Phone Authentication enable nahi hai ya SMS region allowed nahi hai."
      );

    }

    else if (
      error.code ===
      "auth/too-many-requests"
    ) {

      showMessage(
        "Bahut attempts ho gaye. Thodi der baad try karein."
      );

    }

    else {

      showMessage(
        error.message ||
        "OTP send nahi hua."
      );

    }

  }

  finally {

    loading(
      "sendOtpBtn",
      false,
      "Send OTP"
    );

  }

}


// -------------------------
// VERIFY OTP
// -------------------------

async function verifyOtp() {

  clearMessage();

  const otp =
    $("otp").value.trim();


  if (!/^\d{6}$/.test(otp)) {

    showMessage(
      "6 digit OTP enter karein."
    );

    return;
  }


  if (!confirmationResult) {

    showMessage(
      "Pehle Send OTP dabayein."
    );

    return;
  }


  loading(
    "verifyOtpBtn",
    true,
    "Verify OTP"
  );


  try {

    await confirmationResult.confirm(
      otp
    );

    location.replace("index.html");

  }

  catch (error) {

    console.error(error);


    if (
      error.code ===
      "auth/invalid-verification-code"
    ) {

      showMessage(
        "OTP galat hai."
      );

    }

    else if (
      error.code ===
      "auth/code-expired"
    ) {

      showMessage(
        "OTP expire ho gaya. Dobara OTP bhejein."
      );

    }

    else {

      showMessage(
        error.message ||
        "OTP verification failed."
      );

    }

  }

  finally {

    loading(
      "verifyOtpBtn",
      false,
      "Verify OTP"
    );

  }

}


// -------------------------
// CHANGE PHONE
// -------------------------

function changePhone() {

  confirmationResult = null;


  try {

    recaptchaVerifier?.clear();

  } catch (_) {}


  recaptchaVerifier = null;


  $("phoneInputBox")
    .classList
    .remove("hidden");


  $("otpBox")
    .classList
    .add("hidden");


  $("sendOtpBtn")
    .classList
    .remove("hidden");


  $("verifyOtpBtn")
    .classList
    .add("hidden");


  $("changePhoneBtn")
    .classList
    .add("hidden");


  $("otp").value = "";


  clearMessage();

}


// -------------------------
// GOOGLE LOGIN
// -------------------------

async function googleLogin() {

  clearMessage();

  loading(
    "googleLoginBtn",
    true,
    "Continue with Google"
  );


  try {

    const provider =
      new GoogleAuthProvider();


    provider.setCustomParameters({
      prompt: "select_account"
    });


    await signInWithPopup(
      auth,
      provider
    );


    location.replace(
      "index.html"
    );

  }

  catch (error) {

    console.error(error);


    if (
      error.code ===
      "auth/popup-blocked"
    ) {

      showMessage(
        "Google popup block ho gaya. Browser mein popup allow karein."
      );

    }

    else if (
      error.code ===
      "auth/unauthorized-domain"
    ) {

      showMessage(
        "GitHub Pages domain Firebase Authorized Domains mein add karein."
      );

    }

    else {

      showMessage(
        error.message ||
        "Google login failed."
      );

    }

  }

  finally {

    loading(
      "googleLoginBtn",
      false,
      "Continue with Google"
    );

  }

}


// -------------------------
// MAKE FUNCTIONS AVAILABLE
// -------------------------

window.switchMethod =
  switchMethod;

window.emailLogin =
  emailLogin;

window.createAccount =
  createAccount;

window.sendOtp =
  sendOtp;

window.verifyOtp =
  verifyOtp;

window.changePhone =
  changePhone;

window.googleLogin =
  googleLogin;


// -------------------------
// AUTH CHECK
// -------------------------

onAuthStateChanged(
  auth,
  (user) => {

    if (
      user &&
      location.pathname.endsWith(
        "login.html"
      )
    ) {

      location.replace(
        "index.html"
      );

    }

  }
);
