# Welcome to Paulitendance! 📱

Hi there! This guide will help you install and run the Paulitendance app on your computer, even if you have no programming experience. We will go step-by-step!

---

## 🛠️ Phase 1: Things You Need to Download First

Before we can run the app, your computer needs a few basic tools.

1. **Download Node.js**
   - Go to [nodejs.org](https://nodejs.org/).
   - Click the big button that says **"LTS"** (Recommended for Most Users) to download it.
   - Run the downloaded file and install it just like any normal program. (Keep clicking "Next" and accept the default settings).

2. **Download Git**
   - Go to [git-scm.com/downloads](https://git-scm.com/downloads) and download it for your computer (Windows or Mac).
   - Install it. Keep clicking "Next" repeatedly (there are a lot of screens, just accept the defaults!).

3. **Download a Code Editor (Optional but helpful)**
   - Go to [code.visualstudio.com](https://code.visualstudio.com/) and download Visual Studio Code.
   - Install it.

---

## 🚀 Phase 2: Getting the App on Your Computer

1. **Open your Terminal (Command Line)**
   - **For Windows:** Click the Start menu, type `cmd` or `PowerShell`, and press Enter.
   - **For Mac:** Press `Command + Space`, type `Terminal`, and press Enter.

2. **Download the app code**
   Copy the following text, paste it into your black terminal screen, and press **Enter**:
   ```bash
   git clone https://github.com/your-username/PaulitendanceMobile.git
   ```
   *(Note: Replace the link above with the actual link to this app's code if necessary!)*

3. **Go into the app's folder**
   Type this into the terminal and press **Enter**:
   ```bash
   cd PaulitendanceMobile
   ```

---

## ⚙️ Phase 3: Preparing the App

1. **Install the app's pieces**
   Now, copy this exact command, paste it in the terminal, and press **Enter**:
   ```bash
   npm install
   ```
   *(Wait patiently. You might see a lot of text scrolling by. This can take a few minutes!)*

2. **Set up the Database Keys**
   The app needs a secret "key" to talk to the database.
   - Open your project folder (`PaulitendanceMobile`) in Visual Studio Code (or your regular file explorer).
   - Find the file named **`.env.example`**.
   - Copy this file, and rename the newly copied file to **`.env`** (make sure it starts with a dot!).
   - Open the `.env` file and type in your secret Firebase passwords/keys next to the `=` signs. (If you don't know these keys, ask the person who gave you this code!)

---

## 🎉 Phase 4: Final Step! Run the App

1. In your terminal (make sure you are still inside the `PaulitendanceMobile` folder), copy and paste this command and press **Enter**:
   ```bash
   npx expo start
   ```

2. After a few seconds, a big **QR Code** will appear in your terminal.

3. **To see the app on your Phone:**
   - Go to the Apple App Store or Google Play Store on your real phone.
   - Search for **"Expo Go"** and download it.
   - Open the **Expo Go** app on your phone.
   - Tap "Scan QR Code" and scan the code on your computer screen.
   - **Magic!** The app will load onto your phone!

*(Note: Your phone and your computer MUST be connected to the exact same Wi-Fi network for this to work).*

---

### Need Help?
- If the text in your terminal ever stops or gets stuck, try pressing `Ctrl + C` to cancel, and then type `npx expo start` again.
- Make sure you didn't skip Phase 1! The words `git` and `npm` will only work if you downloaded those programs.
