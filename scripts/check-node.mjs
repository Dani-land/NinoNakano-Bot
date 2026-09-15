const [major, minor] = process.versions.node.split('.').map(Number)
const minimum = '21.7.3'

if (major < 21 || (major === 21 && minor < 7)) {
  console.error(`\n❌ Este bot necesita Node.js ${minimum} o superior.`)
  console.error(`   Versión detectada: ${process.versions.node}`)
  console.error('   En Termux ejecuta: pkg update -y && pkg upgrade -y && pkg install -y nodejs\n')
  process.exit(1)
}

console.log(`✓ Node.js ${process.versions.node} listo para Nino Nakano-MD`)