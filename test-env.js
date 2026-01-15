require('dotenv').config();

console.log('=== Environment Variables Check ===');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
console.log('SMTP_SECURE:', process.env.SMTP_SECURE || 'NOT SET');
console.log('SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET*** (length: ' + process.env.SMTP_PASS.length + ')' : 'NOT SET');
console.log('SMTP_FROM:', process.env.SMTP_FROM || 'NOT SET');
console.log('BASE_URL:', process.env.BASE_URL || 'NOT SET');
console.log('APP_URL:', process.env.APP_URL || 'NOT SET');
console.log('===================================');

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n❌ SMTP NOT CONFIGURED');
    console.log('Missing required variables. Add to .env file:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_SECURE=false');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASS=your-app-password');
} else {
    console.log('\n✅ SMTP CONFIGURED');
    console.log('Email service should work after server restart');
}
