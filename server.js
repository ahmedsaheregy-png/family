const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

const { queries } = require('./db');
const { sendWhatsAppBroadcast } = require('./twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuration & Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sessions configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'family_secret_key_987654321',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: false // Set to true if running over HTTPS
  }
}));

// Global layout branding variables available to EJS
app.use((req, res, next) => {
  res.locals.appBranding = {
    title: "الحقيقة التي لن تخبرك بها وفاء",
    subtitle: "هذا ما حدث خلال 20 سنة",
    disclaimer: "الموقع والاحداث امانة وغير معدة للنشر"
  };
  res.locals.session = req.session;
  next();
});

// Authentication Middlewares
function requireViewerAuth(req, res, next) {
  if (req.session.viewerAuthenticated || req.session.adminAuthenticated) {
    return next();
  }
  res.redirect('/login');
}

function requireAdminAuth(req, res, next) {
  if (req.session.adminAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
}

// ==========================================
// VIEWER AUTHENTICATION ROUTES
// ==========================================

app.get('/login', (req, res) => {
  if (req.session.viewerAuthenticated || req.session.adminAuthenticated) {
    return res.redirect('/');
  }
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { passcode } = req.body;
  const currentPasscode = queries.getSetting('viewer_passcode') || 'وفاء_الحقيقة';
  
  if (passcode === currentPasscode) {
    req.session.viewerAuthenticated = true;
    return res.redirect('/');
  }
  
  res.render('login', { error: 'رمز الدخول غير صحيح، يرجى المحاولة مرة أخرى.' });
});

app.get('/logout', (req, res) => {
  req.session.viewerAuthenticated = false;
  res.redirect('/login');
});

// ==========================================
// ADMIN AUTHENTICATION ROUTES
// ==========================================

app.get('/admin/login', (req, res) => {
  if (req.session.adminAuthenticated) {
    return res.redirect('/admin');
  }
  res.render('admin_login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = queries.getSetting('admin_username') || 'admin';
  const adminPassHash = queries.getSetting('admin_password_hash');

  if (username === adminUser && adminPassHash && bcrypt.compareSync(password, adminPassHash)) {
    req.session.adminAuthenticated = true;
    req.session.viewerAuthenticated = true; // Admins should also view content
    return res.redirect('/admin');
  }
  
  res.render('admin_login', { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
});

app.get('/admin/logout', (req, res) => {
  req.session.adminAuthenticated = false;
  res.redirect('/admin/login');
});

// ==========================================
// FRONTEND ROUTES (Viewer Auth Required)
// ==========================================

// Dashboard View
app.get('/', requireViewerAuth, (req, res) => {
  const videos = queries.getVideos();
  const judgments = queries.getJudgments();
  const articles = queries.getArticles();
  
  res.render('index', { videos, judgments, articles });
});

// Single Video Detail View (Persistent URL)
app.get('/videos/:slug', requireViewerAuth, (req, res) => {
  const video = queries.getVideoBySlug(req.params.slug);
  if (!video) {
    return res.status(404).send('الفيديو غير موجود');
  }
  const comments = queries.getComments('video', video.id, true); // only approved comments
  res.render('video', { video, comments, successMsg: null, errMsg: null });
});

// Post Comment on Video
app.post('/videos/:slug/comments', requireViewerAuth, (req, res) => {
  const video = queries.getVideoBySlug(req.params.slug);
  if (!video) return res.status(404).send('الفيديو غير موجود');

  const { author_name, comment_text } = req.body;
  if (!author_name || !comment_text) {
    const comments = queries.getComments('video', video.id, true);
    return res.render('video', { video, comments, successMsg: null, errMsg: 'يرجى كتابة الاسم والتعليق.' });
  }

  queries.createComment('video', video.id, author_name, comment_text);
  
  const comments = queries.getComments('video', video.id, true);
  res.render('video', { 
    video, 
    comments, 
    successMsg: 'تم إرسال تعليقك بنجاح، وسيكون ظاهراً بعد مراجعة المسؤول وموافقته عليه.',
    errMsg: null 
  });
});

// Single Article Detail View (Persistent URL)
app.get('/articles/:slug', requireViewerAuth, (req, res) => {
  const article = queries.getArticleBySlug(req.params.slug);
  if (!article) {
    return res.status(404).send('المقال غير موجود');
  }
  const comments = queries.getComments('article', article.id, true); // only approved
  res.render('article', { article, comments, successMsg: null, errMsg: null });
});

// Post Comment on Article
app.post('/articles/:slug/comments', requireViewerAuth, (req, res) => {
  const article = queries.getArticleBySlug(req.params.slug);
  if (!article) return res.status(404).send('المقال غير موجود');

  const { author_name, comment_text } = req.body;
  if (!author_name || !comment_text) {
    const comments = queries.getComments('article', article.id, true);
    return res.render('article', { article, comments, successMsg: null, errMsg: 'يرجى كتابة الاسم والتعليق.' });
  }

  queries.createComment('article', article.id, author_name, comment_text);
  
  const comments = queries.getComments('article', article.id, true);
  res.render('article', { 
    article, 
    comments, 
    successMsg: 'تم إرسال تعليقك بنجاح، وسيكون ظاهراً بعد مراجعة المسؤول وموافقته عليه.',
    errMsg: null 
  });
});

// ==========================================
// ADMIN PANEL ROUTES (Admin Auth Required)
// ==========================================

// Admin Landing Dashboard
app.get('/admin', requireAdminAuth, (req, res) => {
  const videoCount = queries.getVideos().length;
  const judgmentCount = queries.getJudgments().length;
  const articleCount = queries.getArticles().length;
  const pendingCommentsCount = queries.getAllComments(false).length; // only pending (0)

  res.render('admin/dashboard', { 
    stats: { videoCount, judgmentCount, articleCount, pendingCommentsCount }
  });
});

// Admin Videos List & CRUD Forms
app.get('/admin/videos', requireAdminAuth, (req, res) => {
  const videos = queries.getVideos();
  res.render('admin/videos', { videos, error: null });
});

app.post('/admin/videos/add', requireAdminAuth, async (req, res) => {
  const { slug, title, description, source_type, source_url, order_index } = req.body;
  
  if (!slug || !title || !source_url) {
    const videos = queries.getVideos();
    return res.render('admin/videos', { videos, error: 'يرجى ملء جميع الحقول المطلوبة (الرابط التعريفي، العنوان، رابط الفيديو).' });
  }

  try {
    queries.createVideo(
      slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      title,
      description,
      source_type,
      source_url,
      parseInt(order_index) || 0
    );

    // Send WhatsApp notification
    const waEnabled = queries.getSetting('enable_whatsapp') === 'true';
    if (waEnabled) {
      const siteUrl = `${req.protocol}://${req.get('host')}`;
      const msg = `📢 تم نشر فيديو جديد في منصة التوثيق العائلية:\n\nالعنوان: ${title}\nالرابط: ${siteUrl}/videos/${slug}\n\n*الرجاء الحفاظ على سرية الرابط وعدم نشره خارج العائلة.*`;
      await sendWhatsAppBroadcast(msg);
    }

    res.redirect('/admin/videos');
  } catch (err) {
    const videos = queries.getVideos();
    res.render('admin/videos', { videos, error: 'حدث خطأ: قد يكون الرابط التعريفي (Slug) مستخدماً بالفعل.' });
  }
});

app.post('/admin/videos/edit/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { slug, title, description, source_type, source_url, order_index } = req.body;

  try {
    queries.updateVideo(
      id,
      slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      title,
      description,
      source_type,
      source_url,
      parseInt(order_index) || 0
    );
    res.redirect('/admin/videos');
  } catch (err) {
    const videos = queries.getVideos();
    res.render('admin/videos', { videos, error: 'فشل التعديل: تأكد من عدم استخدام الرابط التعريفي في فيديو آخر.' });
  }
});

app.post('/admin/videos/delete/:id', requireAdminAuth, (req, res) => {
  queries.deleteVideo(req.params.id);
  res.redirect('/admin/videos');
});

// Admin Judgments CRUD
app.get('/admin/judgments', requireAdminAuth, (req, res) => {
  const judgments = queries.getJudgments();
  res.render('admin/judgments', { judgments, error: null });
});

app.post('/admin/judgments/add', requireAdminAuth, async (req, res) => {
  const { title, person_name, opinion_text } = req.body;
  if (!title || !person_name || !opinion_text) {
    const judgments = queries.getJudgments();
    return res.render('admin/judgments', { judgments, error: 'يرجى ملء جميع الحقول المطلوبة.' });
  }

  queries.createJudgment(title, person_name, opinion_text);

  // Send WhatsApp notification
  const waEnabled = queries.getSetting('enable_whatsapp') === 'true';
  if (waEnabled) {
    const siteUrl = `${req.protocol}://${req.get('host')}`;
    const msg = `📢 تم توثيق حكم ورأي عائلي جديد:\n\nالموضوع: ${title}\nصاحب الرأي: ${person_name}\nالتفاصيل في الموقع الرئيسي: ${siteUrl}`;
    await sendWhatsAppBroadcast(msg);
  }

  res.redirect('/admin/judgments');
});

app.post('/admin/judgments/edit/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { title, person_name, opinion_text } = req.body;
  
  queries.updateJudgment(id, title, person_name, opinion_text);
  res.redirect('/admin/judgments');
});

app.post('/admin/judgments/delete/:id', requireAdminAuth, (req, res) => {
  queries.deleteJudgment(req.params.id);
  res.redirect('/admin/judgments');
});

// Admin Articles CRUD
app.get('/admin/articles', requireAdminAuth, (req, res) => {
  const articles = queries.getArticles();
  res.render('admin/articles', { articles, error: null });
});

app.post('/admin/articles/add', requireAdminAuth, async (req, res) => {
  const { slug, title, content, media_type, media_url } = req.body;

  if (!slug || !title || !content) {
    const articles = queries.getArticles();
    return res.render('admin/articles', { articles, error: 'يرجى ملء الحقول المطلوبة (الرابط التعريفي، العنوان، المحتوى).' });
  }

  try {
    queries.createArticle(
      slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      title,
      content,
      media_type || 'none',
      media_url || null
    );

    // Send WhatsApp notification
    const waEnabled = queries.getSetting('enable_whatsapp') === 'true';
    if (waEnabled) {
      const siteUrl = `${req.protocol}://${req.get('host')}`;
      const msg = `📢 تم نشر مقال / خاطرة جديدة:\n\nالعنوان: ${title}\nالرابط: ${siteUrl}/articles/${slug}\n\n*يرجى مراجعته والحفاظ على السرية.*`;
      await sendWhatsAppBroadcast(msg);
    }

    res.redirect('/admin/articles');
  } catch (err) {
    const articles = queries.getArticles();
    res.render('admin/articles', { articles, error: 'فشل الإضافة: الرابط التعريفي مستخدم بالفعل.' });
  }
});

app.post('/admin/articles/edit/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { slug, title, content, media_type, media_url } = req.body;

  try {
    queries.updateArticle(
      id,
      slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      title,
      content,
      media_type || 'none',
      media_url || null
    );
    res.redirect('/admin/articles');
  } catch (err) {
    const articles = queries.getArticles();
    res.render('admin/articles', { articles, error: 'فشل التعديل: الرابط التعريفي مستخدم بالفعل في مقال آخر.' });
  }
});

app.post('/admin/articles/delete/:id', requireAdminAuth, (req, res) => {
  queries.deleteArticle(req.params.id);
  res.redirect('/admin/articles');
});

// Admin Comments Moderation
app.get('/admin/comments', requireAdminAuth, (req, res) => {
  const pendingComments = queries.getAllComments(false); // pending (is_approved=0)
  const approvedComments = queries.getAllComments(true);  // approved (is_approved=1)

  // Map videos/articles to know the source name
  const videos = queries.getVideos();
  const articles = queries.getArticles();
  
  const contentMap = {
    video: {},
    article: {}
  };
  videos.forEach(v => { contentMap.video[v.id] = v.title; });
  articles.forEach(a => { contentMap.article[a.id] = a.title; });

  res.render('admin/comments', { pendingComments, approvedComments, contentMap });
});

app.post('/admin/comments/approve/:id', requireAdminAuth, (req, res) => {
  queries.approveComment(req.params.id);
  res.redirect('/admin/comments');
});

app.post('/admin/comments/delete/:id', requireAdminAuth, (req, res) => {
  queries.deleteComment(req.params.id);
  res.redirect('/admin/comments');
});

// Admin Configuration Settings & Contacts
app.get('/admin/settings', requireAdminAuth, (req, res) => {
  const viewerPasscode = queries.getSetting('viewer_passcode') || 'وفاء_الحقيقة';
  const enableWa = queries.getSetting('enable_whatsapp') === 'true';
  const twilioSid = queries.getSetting('twilio_sid') || '';
  const twilioAuthToken = queries.getSetting('twilio_auth_token') || '';
  const twilioFromNumber = queries.getSetting('twilio_from_number') || '';
  const contacts = queries.getContacts();

  res.render('admin/settings', { 
    settings: { viewerPasscode, enableWa, twilioSid, twilioAuthToken, twilioFromNumber },
    contacts,
    successMsg: null,
    errorMsg: null
  });
});

// Update Viewer Passcode
app.post('/admin/settings/passcode', requireAdminAuth, (req, res) => {
  const { passcode } = req.body;
  const contacts = queries.getContacts();
  const settings = {
    viewerPasscode: passcode,
    enableWa: queries.getSetting('enable_whatsapp') === 'true',
    twilioSid: queries.getSetting('twilio_sid') || '',
    twilioAuthToken: queries.getSetting('twilio_auth_token') || '',
    twilioFromNumber: queries.getSetting('twilio_from_number') || ''
  };

  if (!passcode || passcode.trim() === '') {
    return res.render('admin/settings', { settings, contacts, successMsg: null, errorMsg: 'رمز المرور لا يمكن أن يكون فارغاً.' });
  }

  queries.updateSetting('viewer_passcode', passcode.trim());
  res.render('admin/settings', { settings, contacts, successMsg: 'تم تحديث رمز مرور المشاهدين بنجاح.', errorMsg: null });
});

// Update Twilio Configuration
app.post('/admin/settings/twilio', requireAdminAuth, (req, res) => {
  const { enable_whatsapp, twilio_sid, twilio_auth_token, twilio_from_number } = req.body;
  
  queries.updateSetting('enable_whatsapp', enable_whatsapp === 'on' ? 'true' : 'false');
  queries.updateSetting('twilio_sid', twilio_sid.trim());
  queries.updateSetting('twilio_auth_token', twilio_auth_token.trim());
  queries.updateSetting('twilio_from_number', twilio_from_number.trim());

  // Reload for rendering
  res.redirect('/admin/settings');
});

// Add Contact to WhatsApp subscribers
app.post('/admin/settings/contacts/add', requireAdminAuth, (req, res) => {
  const { name, phone_number } = req.body;

  if (!name || !phone_number) {
    return res.redirect('/admin/settings?error=يرجى كتابة الاسم ورقم الهاتف.');
  }

  try {
    queries.createContact(name.trim(), phone_number.trim());
    res.redirect('/admin/settings');
  } catch (err) {
    res.redirect('/admin/settings?error=رقم الهاتف مسجل بالفعل.');
  }
});

// Delete Contact
app.post('/admin/settings/contacts/delete/:id', requireAdminAuth, (req, res) => {
  queries.deleteContact(req.params.id);
  res.redirect('/admin/settings');
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Server] running on http://localhost:${PORT}`);
});
