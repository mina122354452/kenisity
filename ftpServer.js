const FtpSrv = require("ftp-srv");

const ftpServer = new FtpSrv({
  url: "ftp://0.0.0.0:21",
  pasv_url: "127.0.0.1", // replace with your server's public IP if necessary
  anonymous: false,
});

ftpServer.on("login", ({ connection, username, password }, resolve, reject) => {
  if (username === "user" && password === "password") {
    resolve({ root: "./ftp_root" }); // specify the root directory for this user
  } else {
    reject(new Error("Invalid username or password"));
  }
});

ftpServer
  .listen()
  .then(() => {
    console.log("FTP server is running at ftp://127.0.0.1:21");
  })
  .catch((err) => {
    console.error("Error starting the FTP server:", err);
  });
