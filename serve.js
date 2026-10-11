const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getPhpExecutable() {
  // 1. Check if 'php' is accessible in PATH
  try {
    const cmd = process.platform === 'win32' ? 'where php' : 'which php';
    const result = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split(/[\r\n]+/)[0];
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch (e) {}

  // 2. Fallbacks for Windows (e.g. XAMPP, Laragon)
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\xampp\\php\\php.exe',
      'D:\\xampp\\php\\php.exe',
      'C:\\laragon\\bin\\php\\php.exe',
      'C:\\tools\\php\\php.exe'
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  return 'php';
}

const isTest = process.argv.includes('--test');
const phpBin = getPhpExecutable();

if (isTest) {
  const child = spawn(phpBin, ['tests/api-smoke.php'], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  const args = [
    '-d', 'upload_max_filesize=10M',
    '-d', 'post_max_size=12M',
    '-S', '127.0.0.1:8080',
    'router.php'
  ];

  console.log('========================================================');
  console.log('   Co-StudyMaxx Development Server');
  console.log('========================================================');
  console.log(`Using PHP: ${phpBin}`);
  console.log('Starting server on http://127.0.0.1:8080 ...\n');

  const child = spawn(phpBin, args, { stdio: 'inherit' });

  child.on('error', (err) => {
    console.error('\n[ERROR] Failed to start PHP server:', err.message);
    console.error('Please ensure PHP or XAMPP is installed at C:\\xampp\\php\\php.exe\n');
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}
