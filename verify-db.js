const { queries } = require('./db');

try {
  console.log('--- بدء التحقق من قاعدة البيانات والاتصال ---');
  
  // Test 1: Fetch settings passcode
  const passcode = queries.getSetting('viewer_passcode');
  console.log(`[التحقق] رمز مرور المشاهدين الحالي: ${passcode}`);
  
  // Test 2: Fetch videos list
  const videos = queries.getVideos();
  console.log(`[التحقق] عدد الفيديوهات المضافة: ${videos.length}`);
  if (videos.length > 0) {
    console.log(` - العنوان الأول: "${videos[0].title}" (Slug: ${videos[0].slug})`);
  }

  // Test 3: Fetch judgments
  const judgments = queries.getJudgments();
  console.log(`[التحقق] عدد الشهادات والآراء: ${judgments.length}`);
  if (judgments.length > 0) {
    console.log(` - صاحب الشهادة: ${judgments[0].person_name}`);
  }

  // Test 4: Fetch articles
  const articles = queries.getArticles();
  console.log(`[التحقق] عدد المقالات والخواطر: ${articles.length}`);
  if (articles.length > 0) {
    console.log(` - عنوان المقال الأول: "${articles[0].title}"`);
  }

  console.log('--- تم التحقق بنجاح! قاعدة البيانات مهيأة وسليمة تماماً ---');
  process.exit(0);
} catch (err) {
  console.error('[خطأ] فشل في عملية التحقق من قاعدة البيانات:', err.message);
  process.exit(1);
}
