const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = path.join(__dirname, 'database.json');

// Memory storage cache
let data = {
  settings: {},
  videos: [],
  judgments: [],
  articles: [],
  comments: [],
  whatsapp_contacts: []
};

// Helper to save current memory state to file
function save() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[Error] Failed to write database.json:', err.message);
  }
}

// Helper to load state from file
function load() {
  if (fs.existsSync(dbPath)) {
    try {
      const fileContent = fs.readFileSync(dbPath, 'utf8');
      data = JSON.parse(fileContent);
    } catch (err) {
      console.error('[Error] Failed to parse database.json, using empty fallback:', err.message);
    }
  } else {
    // Initialize file
    save();
  }
}

// Initialize database schema and seeds
function initDatabase() {
  load();

  // Seed default configuration settings if not present
  seedDefaultSettings();
}

function seedDefaultSettings() {
  let changed = false;

  // 1. Viewer Passcode
  if (!data.settings.viewer_passcode) {
    data.settings.viewer_passcode = process.env.VIEWER_PASSCODE || 'وفاء_الحقيقة';
    changed = true;
  }

  // 2. Enable WhatsApp toggle
  if (!data.settings.enable_whatsapp) {
    data.settings.enable_whatsapp = process.env.ENABLE_WHATSAPP || 'false';
    changed = true;
  }

  // 3. Admin User account setup
  if (!data.settings.admin_username) {
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(adminPass, salt);
    
    data.settings.admin_username = adminUser;
    data.settings.admin_password_hash = hash;
    changed = true;
  }

  // 4. Seed initial mock content if videos list is empty
  if (data.videos.length === 0) {
    data.videos.push({
      id: 1,
      slug: 'intro-video',
      title: 'الفيديو الأول: مقدمة الأحداث والتوثيق الشامل',
      description: 'هذا الفيديو يشرح بالتفصيل جذور الأحداث والظروف التي أحاطت بالعائلة خلال العشرين سنة الماضية، مع استعراض أهم المحاور التي سيتم تناولها في المنصة.',
      source_type: 'youtube',
      source_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
      order_index: 1,
      created_at: new Date().toISOString()
    });

    data.judgments.push({
      id: 1,
      title: 'حكم الشيخ أبو فهد بخصوص تقسيم الأوراق والتوثيق',
      person_name: 'الشيخ أبو فهد (العم الأكبر)',
      opinion_text: 'الأحداث التي مرت بها الأسرة خلال العقدين الأخيرين تتطلب حفظ الحقيقة بكل أمانة لتلافي تزييف التاريخ العائلي، وما يقوم به الأبناء من توثيق هو عمل ضروري ومسؤول يحفظ الحقوق المعنوية لجميع الأطراف المعنية.',
      created_at: new Date().toISOString()
    });

    data.articles.push({
      id: 1,
      slug: 'first-article',
      title: 'التقرير التاريخي الأول: تسلسل الوقائع',
      content: '<p>لقد بدأت القصة منذ عام ٢٠٠٦ عندما طرأت بعض التغيرات غير المتوقعة في العلاقات العائلية وإدارة الأملاك المشتركة. نورد في هذه المقالة التفصيلية تسلسلاً زمنياً دقيقاً للأحداث كما هي مسجلة في الأوراق الرسمية والمراسلات الشخصية المتبادلة.</p><p>الهدف من هذا المقال هو تقديم رؤية واضحة ومستندة للحقائق دون أي تحيز أو تجميل للأمور، ليعرف الجميع الحقيقة كاملة التي طالما تم إخفاؤها.</p>',
      media_type: 'none',
      media_url: null,
      created_at: new Date().toISOString()
    });

    data.whatsapp_contacts.push({
      id: 1,
      name: 'المشرف العائلي',
      phone_number: '+201000000000',
      created_at: new Date().toISOString()
    });

    changed = true;
  }

  if (changed) {
    save();
  }
}

// Helper methods mimicking SQLite queries
const queries = {
  // Settings
  getSetting: (key) => {
    load();
    return data.settings[key];
  },
  updateSetting: (key, value) => {
    load();
    data.settings[key] = value;
    save();
    return { changes: 1 };
  },

  // Videos
  getVideos: () => {
    load();
    return [...data.videos].sort((a, b) => {
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  },
  getVideoById: (id) => {
    load();
    return data.videos.find(v => v.id === parseInt(id));
  },
  getVideoBySlug: (slug) => {
    load();
    return data.videos.find(v => v.slug === slug);
  },
  createVideo: (slug, title, description, source_type, source_url, order_index) => {
    load();
    if (data.videos.some(v => v.slug === slug)) {
      throw new Error('Slug already exists');
    }
    const maxId = data.videos.reduce((max, v) => v.id > max ? v.id : max, 0);
    const newVideo = {
      id: maxId + 1,
      slug,
      title,
      description,
      source_type,
      source_url,
      order_index: parseInt(order_index) || 0,
      created_at: new Date().toISOString()
    };
    data.videos.push(newVideo);
    save();
    return { lastInsertRowid: newVideo.id };
  },
  updateVideo: (id, slug, title, description, source_type, source_url, order_index) => {
    load();
    const videoIndex = data.videos.findIndex(v => v.id === parseInt(id));
    if (videoIndex === -1) throw new Error('Video not found');
    
    // Check slug collision
    const existingWithSlug = data.videos.find(v => v.slug === slug);
    if (existingWithSlug && existingWithSlug.id !== parseInt(id)) {
      throw new Error('Slug already exists');
    }

    data.videos[videoIndex] = {
      ...data.videos[videoIndex],
      slug,
      title,
      description,
      source_type,
      source_url,
      order_index: parseInt(order_index) || 0
    };
    save();
    return { changes: 1 };
  },
  deleteVideo: (id) => {
    load();
    data.videos = data.videos.filter(v => v.id !== parseInt(id));
    // Cascade delete comments
    data.comments = data.comments.filter(c => !(c.target_type === 'video' && c.target_id === parseInt(id)));
    save();
    return { changes: 1 };
  },

  // Judgments
  getJudgments: () => {
    load();
    return [...data.judgments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  getJudgmentById: (id) => {
    load();
    return data.judgments.find(j => j.id === parseInt(id));
  },
  createJudgment: (title, person_name, opinion_text) => {
    load();
    const maxId = data.judgments.reduce((max, j) => j.id > max ? j.id : max, 0);
    const newJudgment = {
      id: maxId + 1,
      title,
      person_name,
      opinion_text,
      created_at: new Date().toISOString()
    };
    data.judgments.push(newJudgment);
    save();
    return { lastInsertRowid: newJudgment.id };
  },
  updateJudgment: (id, title, person_name, opinion_text) => {
    load();
    const index = data.judgments.findIndex(j => j.id === parseInt(id));
    if (index === -1) throw new Error('Judgment not found');
    data.judgments[index] = {
      ...data.judgments[index],
      title,
      person_name,
      opinion_text
    };
    save();
    return { changes: 1 };
  },
  deleteJudgment: (id) => {
    load();
    data.judgments = data.judgments.filter(j => j.id !== parseInt(id));
    save();
    return { changes: 1 };
  },

  // Articles
  getArticles: () => {
    load();
    return [...data.articles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  getArticleById: (id) => {
    load();
    return data.articles.find(a => a.id === parseInt(id));
  },
  getArticleBySlug: (slug) => {
    load();
    return data.articles.find(a => a.slug === slug);
  },
  createArticle: (slug, title, content, media_type, media_url) => {
    load();
    if (data.articles.some(a => a.slug === slug)) {
      throw new Error('Slug already exists');
    }
    const maxId = data.articles.reduce((max, a) => a.id > max ? a.id : max, 0);
    const newArticle = {
      id: maxId + 1,
      slug,
      title,
      content,
      media_type,
      media_url,
      created_at: new Date().toISOString()
    };
    data.articles.push(newArticle);
    save();
    return { lastInsertRowid: newArticle.id };
  },
  updateArticle: (id, slug, title, content, media_type, media_url) => {
    load();
    const index = data.articles.findIndex(a => a.id === parseInt(id));
    if (index === -1) throw new Error('Article not found');

    const existingWithSlug = data.articles.find(a => a.slug === slug);
    if (existingWithSlug && existingWithSlug.id !== parseInt(id)) {
      throw new Error('Slug already exists');
    }

    data.articles[index] = {
      ...data.articles[index],
      slug,
      title,
      content,
      media_type,
      media_url
    };
    save();
    return { changes: 1 };
  },
  deleteArticle: (id) => {
    load();
    data.articles = data.articles.filter(a => a.id !== parseInt(id));
    // Cascade delete comments
    data.comments = data.comments.filter(c => !(c.target_type === 'article' && c.target_id === parseInt(id)));
    save();
    return { changes: 1 };
  },

  // Comments
  getComments: (target_type, target_id, approvedOnly = true) => {
    load();
    return data.comments
      .filter(c => c.target_type === target_type && c.target_id === parseInt(target_id) && (!approvedOnly || c.is_approved === 1))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  getAllComments: (approvedOnly = null) => {
    load();
    return data.comments
      .filter(c => approvedOnly === null || c.is_approved === (approvedOnly ? 1 : 0))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  createComment: (target_type, target_id, author_name, comment_text) => {
    load();
    const maxId = data.comments.reduce((max, c) => c.id > max ? c.id : max, 0);
    const newComment = {
      id: maxId + 1,
      target_type,
      target_id: parseInt(target_id),
      author_name,
      comment_text,
      is_approved: 0, // default is pending
      created_at: new Date().toISOString()
    };
    data.comments.push(newComment);
    save();
    return { lastInsertRowid: newComment.id };
  },
  approveComment: (id) => {
    load();
    const index = data.comments.findIndex(c => c.id === parseInt(id));
    if (index !== -1) {
      data.comments[index].is_approved = 1;
      save();
    }
    return { changes: 1 };
  },
  deleteComment: (id) => {
    load();
    data.comments = data.comments.filter(c => c.id !== parseInt(id));
    save();
    return { changes: 1 };
  },

  // WhatsApp Contacts
  getContacts: () => {
    load();
    return [...data.whatsapp_contacts].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  },
  createContact: (name, phone_number) => {
    load();
    if (data.whatsapp_contacts.some(c => c.phone_number === phone_number)) {
      throw new Error('Contact number already registered');
    }
    const maxId = data.whatsapp_contacts.reduce((max, c) => c.id > max ? c.id : max, 0);
    const newContact = {
      id: maxId + 1,
      name,
      phone_number,
      created_at: new Date().toISOString()
    };
    data.whatsapp_contacts.push(newContact);
    save();
    return { lastInsertRowid: newContact.id };
  },
  deleteContact: (id) => {
    load();
    data.whatsapp_contacts = data.whatsapp_contacts.filter(c => c.id !== parseInt(id));
    save();
    return { changes: 1 };
  }
};

// Initialize on load
initDatabase();

module.exports = {
  queries
};
