const fs = require("fs");
const path = require("path");
const zlib = require("zlib")
const crypto = require("crypto")

const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    readGitBlob();
    break;
  case "hash-object":
    hashGitObject();
    break;
  case "ls-tree":
    lsTree();
    break;
  case "write-tree":
    writeTree();
    break;
  case "commit-tree":
    CommitTree();
    break;
  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}

function readGitBlob(){
    const hash = process.argv[4];
    const compressed_data = fs.readFileSync(path.join(process.cwd(), ".git", "objects",hash.slice(0,2),hash.slice(2)));
    const Data_Unzip = zlib.inflateSync(compressed_data);
    const ans = Data_Unzip.toString().split('\0')[1];
    process.stdout.write(ans);
}

function hashGitObject(){
  const writeCmd = process.argv[3];
  const file = process.argv[4];

  if(writeCmd !== "-w") return;

  let fileContents = fs.readFileSync(file,'binary');
  fileContents = Buffer.from(fileContents.replace(/\r\n/g, "\n"),"binary");
  // const content = fs.readFileSync(file);

  const header= `blob ${fileContents.length}\x00`;
  // console.log(header)
  // const data = Buffer.concat([Buffer.from(header,'binary'), content]);
  const data = Buffer.concat([Buffer.from(header,"binary"), fileContents]);
  const hash = crypto.createHash("sha1").update(data).digest("hex");
  
  const objDirPath = path.join(__dirname, ".git","objects");
  const hashDirPath = path.join(objDirPath,hash.slice(0,2));
  const filePath = path.join(hashDirPath,hash.slice(2));

  fs.mkdirSync(hashDirPath,{recursive:true});
  fs.writeFileSync(
     filePath, zlib.deflateSync(data));
  console.log(hash);

}

function lsTree() {
  const isNameOnly = process.argv[3];
  let hash = '';

  if (isNameOnly === '--name-only') {
    hash = process.argv[4];
  } else {
    hash = process.argv[3];
  }

  const dirName = hash.slice(0, 2);
  const fileName = hash.slice(2);
  const objectPath = path.join(process.cwd(), '.git', 'objects', dirName, fileName);

  if (!fs.existsSync(objectPath)) {
    console.error('Error: Tree object not found!');
    return;
  }

  const dataFromFile = fs.readFileSync(objectPath);
  const inflated = zlib.inflateSync(dataFromFile);
  const entries = inflated.toString('utf-8').split('\x00').slice(1);

  const names = entries
    .filter((line) => line.includes(' '))
    .map((line) => line.split(' ')[1]);
  
  const response = names.join('\n').concat('\n').replace(/\n\n/g, '\n');
  process.stdout.write(response);
}

function writeFileBlob(currPath){
  // const writeCmd = process.argv[3];
  // const file = process.argv[4];

  // if(writeCmd !== "-w") return;

  let fileContents = fs.readFileSync(currPath,'binary');
  fileContents = Buffer.from(fileContents.replace(/\r\n/g, "\n"),"binary");
  // const content = fs.readFileSync(file);

  const header= `blob ${fileContents.length}\x00`;
  const data = Buffer.concat([Buffer.from(header,"binary"), fileContents]);

  const hash = crypto.createHash("sha1").update(data).digest("hex");
  
  const objDirPath = path.join(__dirname, ".git","objects");
  const hashDirPath = path.join(objDirPath,hash.slice(0,2));
  const filePath = path.join(hashDirPath,hash.slice(2));

  fs.mkdirSync(hashDirPath,{recursive:true});
  fs.writeFileSync(
     filePath, zlib.deflateSync(data));
  return hash;
}


function recursiveCreateTree(basepath) {
  const dirContents = fs.readdirSync(basepath);
  const entries = [];

  for (const dirContent of dirContents) {
    if (dirContent === ".git") continue;

    const currPath = path.join(basepath, dirContent);
    const stat = fs.statSync(currPath);

    if (stat.isDirectory()) {
      const sha = recursiveCreateTree(currPath);
      if (sha) {
        entries.push({
          mode: '040000',
          type: 'tree',
          sha,
          name: path.basename(currPath),
        });
      }
    } else if (stat.isFile()) {
      const sha = writeFileBlob(currPath);
      entries.push({
        mode: '100644',
        type: 'blob',
        sha,
        name: path.basename(currPath),
      });
    }
  }

  if (dirContents.length === 0 || entries.length === 0) {
    return null;
  }

  const treeData = entries.reduce((acc, res) => {
    const { mode, name, sha } = res;
    return Buffer.concat([
      acc,
      Buffer.from(`${mode} ${name}\x00`),
      Buffer.from(sha, 'hex'),
    ]);
  }, Buffer.alloc(0));

  const tree = Buffer.concat([Buffer.from(`tree ${treeData.length}\x00`), treeData]);
  const hash = crypto.createHash('sha1').update(tree).digest('hex');

  // Store the tree object
  const treeDir = path.join(process.cwd(), '.git', 'objects', hash.slice(0, 2));
  
  if (!fs.existsSync(treeDir)) fs.mkdirSync(treeDir, { recursive: true });

  fs.writeFileSync(path.join(treeDir, hash.slice(2)), zlib.deflateSync(tree));
  
  // Print in table format
  console.log(`${'Mode'.padEnd(8)} ${'Type'.padEnd(6)} ${'SHA'.padEnd(40)} ${'Name'}`);
  entries.forEach(entry => {
    console.log(`${entry.mode.padEnd(8)} ${entry.type.padEnd(6)} ${entry.sha} ${entry.name}`);
  });

  return hash;
}

function writeTree() {
  const hash = recursiveCreateTree('./');
  console.log("Tree Hash:", hash);
}

function CommitTree(){
    const treeSHA = process.argv[3];
    const ParentCommitSHA = process.argv[5]; //parent wala
    const commitMessage = process.argv[7];


    const currentTimestamp = Math.floor(Date.now() / 1000);
    const commitContentBuffer = Buffer.concat([
      Buffer.from(`tree ${treeSHA}\n`),
      Buffer.from(`parent ${ParentCommitSHA}\n`),
      Buffer.from(`Author: ShashankPatil35 <shashankmpatil3535@gmail.com> ${currentTimestamp} +0000\n`),
      Buffer.from(`Commiter: ShashankPatil35 <shashankmpatil3535@gmail.com> ${currentTimestamp} +0000\n\n`),
      Buffer.from(`${commitMessage}\n`)      
    ]);
    const header = `commit ${commitContentBuffer.length}\0`;

    const commitBuffer = Buffer.concat([Buffer.from(header),commitContentBuffer]);



    const commitHash = crypto.createHash("sha1").update(commitBuffer).digest("hex");

  const folder = commitHash.slice(0,2);
  const file = commitHash.slice(2);
  const CompleteFolderPath = path.join(process.cwd(), ".git","objects",folder);

  if (!fs.existsSync(CompleteFolderPath))
     fs.mkdirSync(CompleteFolderPath, { recursive: true });

  const compressedCommit = zlib.deflateSync(commitBuffer);
  fs.writeFileSync(path.join(CompleteFolderPath,file),compressedCommit)

  process.stdout.write(commitHash);
}

// function CommitTree() {
//   const treeSHA = process.argv[3];
//   const commitSHA = process.argv[5] || ''; // If there is no parent commit
//   const commitMessage = process.argv[7];

//   const author = `Author: ShashankPatil35 <shashankmpatil3535@gmail.com> ${Math.floor(Date.now() / 1000)} +0000`;
//   const committer = author;

//   // Build the commit data
//   let data = `tree ${treeSHA}\n`;

//   if (commitSHA)
//     data += `parent ${commitSHA}\n`;

//   data += `${author}\n${committer}\n\n${commitMessage}`;

//   // Build the header with the correct length
//   const header = `commit ${data.length}\0`;
//   const commitObject = header + data;

//   // Calculate commit hash
//   const commitHash = crypto.createHash("sha1").update(commitObject).digest("hex");

//   // Prepare directory and file path for the object
//   const folder = commitHash.slice(0, 2);
//   const file = commitHash.slice(2);
//   const completeFolderPath = path.join(process.cwd(), ".git", "objects", folder);

//   if (!fs.existsSync(completeFolderPath)) {
//       fs.mkdirSync(completeFolderPath, { recursive: true });
//   }

//   // Compress commit object
//   const compressedData = zlib.deflateSync(Buffer.from(commitObject));
//   fs.writeFileSync(path.join(completeFolderPath, file), compressedData);

//   // Output commit hash
//   process.stdout.write(commitHash);
// }

