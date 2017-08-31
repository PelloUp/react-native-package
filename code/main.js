/**
 * Created by yinpeile on 2017/8/30.
 */

var fs = require('fs');
var p = require('path');
var crypto = require('crypto');
var readline = require('readline');
var archiver = require('archiver');
var exec = require('child_process').exec;
var diffMatch = require('../google-diff-match-patch/diff_match_patch_uncompressed');

var version = '1.0.0';

var rl = readline.createInterface({
    input:process.stdin,
    output:process.stdout,
    prompt:'请输入新的版本号>'
});

rl.prompt();

rl.on('line', (input) => {

    version = input;

    // 生成jsbundle文件
    generateBundleFile(()=>{
        console.log('package success');

        // 生成diff文件
        generateDiffFile(()=>{
            console.log("write success");

            // 压缩diff文件和图片资源
            zipFile(getNewFilePath(), getZipPath()).then(()=>{
                console.log('full zip finished');

                // 计算文件md5
                getFileMd5(getZipPath(), (sign)=>{
                    console.log('full zip md5: ' + sign);
                });
            });

            // 压缩jsbundle文件和图片资源
            zipFile(getFinalFilePath(), getDiffZipPath()).then(()=>{
                console.log('diff zip finished');

                getFileMd5(getDiffZipPath(), (sign)=>{
                    console.log('diff zip md5: ' + sign)
                });
            });

            // 关闭输入流
            rl.close();
        });
    });
});


//////////////// Function ////////////////////////

// 资源文件夹名称
const source_dir = 'sources';
const root_path = '/Users/yinpeile/Pello';
const dir_name = __dirname;

// 获取基文件目录
function getBaseFilePath() {
    return dir_name + '/../' + source_dir + '/ios/afp/afp_4.0.0.jsbundle';
}

// 获取需要升级文件路径
function getNewFilePath() {
    return dir_name + '/../' + source_dir + '/ios/afp/afp_' + version +'.jsbundle';
}

// 获取diff文件路径
function getFinalFilePath() {
    return dir_name + '/../' + source_dir + '/ios/afp/afp_' + version +'_diff.jsbundle';
}

// 获取图片资源路径
function getAssetsPath() {
    return dir_name + '/../' + source_dir + '/ios/afp/assets';
}

function getZipPath() {
    return dir_name + '/../' + source_dir + '/ios/afp/afp_' + version +'_ios.zip';
}

// 获取压缩包路径
function getDiffZipPath() {
    return dir_name + '/../' + source_dir + '/ios/afp/afp_' + version +'_diff_ios.zip';
}

function generateBundleFile(callback) {
    console.log("正在打包...");
    let cmdPath = 'cd ' + root_path + '/chuchujie/ReactNative';
    let cmdPackage =
        'react-native bundle ' +
        '--entry-file ./afp/index.ios.js ' +
        '--bundle-output ' + getNewFilePath(version) + ' ' +
        '--assets-dest ' + getAssetsPath() + '/../ ' +
        '--platform ios --dev false';
    let cmdFull = cmdPath + " && " + cmdPackage;
    exec(cmdFull, function (err, stdout, stderr) {
        if (err) {
            console.log("package error:");
            console.log(err);
        }else {
            callback();
        }
    });
}

// 对比两个文件,生成diff文件
function generateDiffFile(callback) {
    let oldPath = getBaseFilePath();
    let newPath = getNewFilePath(version);
    let diffPath = getFinalFilePath(version);
    let old_data = fs.readFileSync(oldPath);
    let new_data = fs.readFileSync(newPath);
    let dmp = new diffMatch.diff_match_patch();
    let diffs = dmp.diff_main(old_data.toString(), new_data.toString());
    let patches = dmp.patch_make(diffs);
    let patchesStr = dmp.patch_toText(patches);
    fs.writeFile(diffPath, patchesStr, callback);
}

// 压缩bundle文件和asset文件夹
function zipFile(filePath, zipFilePath) {
    let files = [filePath, getAssetsPath()];
    let zipPath = zipFilePath;
    let output = fs.createWriteStream(zipPath);
    let zipArchiver = archiver('zip');
    zipArchiver.pipe(output);
    zipArchiver.file(files[0], {name:p.basename(files[0])});
    zipArchiver.directory(files[1], p.basename(files[1]));
    return zipArchiver.finalize();
}

// 获取文件md5
function getFileMd5(filePath, callback) {
    let rs = fs.createReadStream(filePath);
    let hash = crypto.createHash('md5');
    rs.on('data', hash.update.bind(hash));
    rs.on('end', function () {
        let md5Str = hash.digest('hex').toUpperCase();
        callback(md5Str);
    });
}