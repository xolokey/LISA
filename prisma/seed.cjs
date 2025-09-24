const { 
  userService, 
  preferencesService, 
  documentService,
  connectDatabase, 
  disconnectDatabase 
} = require('../server/database.cjs');

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    await connectDatabase();

    // Create admin user
    const adminUser = await userService.create({
      email: 'admin@lisa.com',
      password: 'admin123456',
      name: 'Lisa Admin',
      role: 'admin'
    });
    console.log('✅ Created admin user:', adminUser.email);

    // Create test user
    const testUser = await userService.create({
      email: 'test@lisa.com',
      password: 'test123456',
      name: 'Test User',
      role: 'user'
    });
    console.log('✅ Created test user:', testUser.email);

    // Set preferences for test user
    await preferencesService.create(testUser.id, {
      theme: 'dark',
      language: 'en',
      voiceEnabled: true,
      notificationsEnabled: true,
      customSettings: {
        defaultModel: 'gemini-pro',
        codeHighlighting: true,
        showLineNumbers: true
      }
    });
    console.log('✅ Created preferences for test user');

    // Create some sample documents
    const documents = [
      {
        title: 'Welcome to LISA',
        content: 'LISA (Language Intelligence & Semantic Assistant) is your advanced AI personal assistant...',
        contentType: 'markdown',
        tags: 'welcome,documentation,getting-started',
        isPublic: true
      },
      {
        title: 'API Documentation',
        content: 'Complete API documentation for LISA endpoints...',
        contentType: 'markdown',
        tags: 'api,documentation,technical',
        isPublic: true
      },
      {
        title: 'Troubleshooting Guide',
        content: 'Common issues and their solutions...',
        contentType: 'markdown',
        tags: 'troubleshooting,help,support',
        isPublic: true
      }
    ];

    for (const doc of documents) {
      await documentService.create(doc);
      console.log(`✅ Created document: ${doc.title}`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\nTest accounts created:');
    console.log('Admin: admin@lisa.com / admin123456');
    console.log('User:  test@lisa.com / test123456');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });