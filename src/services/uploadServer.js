const { exec } = require("child_process");

exports.uploadToRemote = async (filename, localpath, remotepath, callback) => {
  let url = `sshpass -p ${process.env.DATA_SERVER_CRED_root_PASSWORD} rsync --chmod=u+rwx,g+rwx,o+rwx ${localpath}${filename} ${process.env.DATA_SERVER_CRED_root_USERNAME}@${process.env.DATA_SERVER_CRED_root_IP}:${remotepath}`;
  await exec(url, (err, stdout, stderr) => {
    if (err) {
      callback(false);
    }
    callback(true);
  });
};