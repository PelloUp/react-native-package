/**
 * Created by yinpeile on 2017/8/30.
 */

var fs = require('fs');
var p = require('path');
var crypto = require('crypto');
var readline = require('readline');
var archiver = require('archiver');
var diffMatch = require('../google-diff-match-patch/diff_match_patch_uncompressed');

var rl = readline.createInterface({
    input:process.stdin,
    output:process.stdout,
    prompt:'请输入新的版本号>'
});

rl.prompt();

rl.on('line', (version) => {

    // 生成diff文件
    generateDiffFile(version, ()=>{
        console.log("write success");

        // 压缩diff文件和图片资源
        zipDiffFile(version).then(()=>{
            console.log('zip finished');

            // 计算文件md5
            getFileMd5(version, (sign)=>{
                console.log(sign);

                // 关闭输入流
                rl.close();
            });
        });
    });
});


//////////////// Function ////////////////////////

// 资源文件夹名称
const source_dir = 'sources';

// 获取基文件目录
function getBaseFilePath() {
    return __dirname + '/../' + source_dir + '/afp_4.0.0.jsbundle';
}

// 获取需要升级文件路径
function getNewFilePath(version) {
    return __dirname + '/../' + source_dir + '/afp_' + version + '.jsbundle';
}

// 获取diff文件路径
function getFinalFilePath(version) {
    return __dirname + '/../' + source_dir + '/afp_' + version + '_diff.jsbundle';
}

// 获取图片资源路径
function getAssetsPath() {
    return __dirname + '/../' + source_dir + '/assets';
}

// 获取压缩包路径
function getZipPath(version) {
    return __dirname + '/../' + source_dir + '/afp_' + version + '_diff_ios.zip';
}

// 对比两个文件,生成diff文件
function generateDiffFile(version, callback) {
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

// 压缩diff文件和asset文件夹
function zipDiffFile(version) {
    let files = [getFinalFilePath(version), getAssetsPath()];
    let zipPath = getZipPath(version);
    let output = fs.createWriteStream(zipPath);
    let zipArchiver = archiver('zip');
    zipArchiver.pipe(output);
    zipArchiver.file(files[0], {name:p.basename(files[0])});
    zipArchiver.directory(files[1], files[1].replace('./' + source_dir, ''));
    return zipArchiver.finalize();
}

// 获取文件md5
function getFileMd5(version, callback) {
    let zipPath = getZipPath(version);
    let rs = fs.createReadStream(zipPath);
    let hash = crypto.createHash('md5');
    rs.on('data', hash.update.bind(hash));
    rs.on('end', function () {
        let md5Str = hash.digest('hex').toUpperCase();
        callback(md5Str);
    });
}