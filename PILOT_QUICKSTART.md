# Install and run the corrected phone pilot

This is a local test build, not an internet-hosted launch. WhatsApp only transfers the APK; it does not start the server.

1. Transfer `HandyHive-0.2.0-local-pilot.apk` from your computer's Downloads folder to your Android phone and install it. Open **HandyHive Pilot**. It installs alongside the old HandyHive app and uses synthetic data.
2. Keep the computer awake and connect both devices to the same Wi-Fi. This build expects the computer at `10.184.63.213`.
3. Double-click `START_HANDYHIVE.cmd` in this repository and keep its window open. Alternatively, in PowerShell, run:

   ```powershell
   .\scripts\start-pilot.ps1
   ```

4. On the **phone**, open [the pilot health check](http://10.184.63.213:4175/api/v1/health). It must return JSON containing `"status":"ok"`. If it cannot open, the APK cannot connect either. Campus/guest networks can block communication between devices; use a suitable private network and rebuild for the computer's new IP if necessary. Keep Firewall protections on and use a narrowly scoped local-network rule if your network administrator requires one.
5. Open HandyHive. Choose “Use a preview account”. Sign in as `customer-demo` or `worker-demo`, password `HandyHive-local-demo`. Additional test workers: `electric-demo`, `cleaning-demo`, `painting-demo`.
6. Book a worker using the customer account. Accept and mark arrival in the worker account. The customer must confirm the person's identity at arrival; only then can the worker start. Diagnostic visits also require an accepted repair quote or diagnostic-only closure. Test private safety concerns from booking details.

If the launcher says HandyHive Pilot is already running, keep the original server window open and continue to the phone health check. If another program occupies port 4175, close that program before restarting the launcher.

## USB pilot when Wi-Fi cannot connect

Use `HandyHive-0.2.0-usb-pilot.apk` from your computer's Downloads folder. It installs alongside the Wi-Fi version as **HandyHive USB Pilot**.

1. Enable Developer options and USB debugging on the Android phone. Connect it to your own computer with a USB data cable and accept that computer's debugging prompt on the phone. [Android device setup](https://developer.android.com/studio/run/device).
2. Double-click `START_HANDYHIVE_USB.cmd` and leave the server running. The launcher installs the APK from Downloads if the phone doesn't have it yet, sets up [Android USB port forwarding](https://developer.android.google.cn/develop/ui/views/layout/webapps/access-local-server?hl=en), and binds the API to computer loopback.
3. Open [the USB health check](http://127.0.0.1:4175/api/v1/health) in the phone's browser. Once it shows `"status":"ok"`, open **HandyHive USB Pilot** and use the same demo sign-in. Keep the cable connected. After unplugging and reconnecting, run the USB launcher again to restore forwarding.

The Wi-Fi and USB pilots use the same demo database on your computer. The USB APK needs the USB launcher and its own endpoint.

The launcher prepares demo data only if the phone-pilot database does not already exist. Existing pilot data is retained. No real identity evidence, addresses or payments should be entered in this HTTP pilot.

To rebuild for a new private network:

```powershell
.\scripts\build-android.ps1 -Pilot -ApiUrl 'http://YOUR-COMPUTER-IP:4175/api/v1'
.\scripts\start-pilot.ps1 -Address 'YOUR-COMPUTER-IP'
```

The Android SDK, Java and installed dependencies under `C:/hhapk` are used by the build script. Public operation requires a hosted HTTPS API and real SMS/worker checks; see [Security and launch](SECURITY_AND_LAUNCH.md).

Validation status: local API tests and browser checks are separate from phone testing. No physical Android device was connected during this work. Automatic approval review blocked the agent from starting the network-accessible server, so step 3 is still required on your computer.
