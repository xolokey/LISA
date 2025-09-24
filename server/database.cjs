const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Database connection and health check
const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

const disconnectDatabase = async () => {
  await prisma.$disconnect();
  console.log('📴 Database disconnected');
};

// User operations
const userService = {
  async create(userData) {
    const { email, password, name, role = 'user' } = userData;
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    return user;
  },

  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        createdAt: true,
      }
    });
  },

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });
  },

  async update(id, updateData) {
    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  },

  async delete(id) {
    return await prisma.user.delete({
      where: { id }
    });
  },

  async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

// Chat session operations
const chatSessionService = {
  async create(userId, sessionData) {
    const { title = 'New Chat', messages = [] } = sessionData;
    
    return await prisma.chatSession.create({
      data: {
        userId,
        title,
        messages,
      }
    });
  },

  async findByUserId(userId, limit = 50, offset = 0) {
    return await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  },

  async findById(sessionId, userId) {
    return await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId, // Ensure user owns the session
      }
    });
  },

  async update(sessionId, userId, updateData) {
    return await prisma.chatSession.updateMany({
      where: {
        id: sessionId,
        userId, // Ensure user owns the session
      },
      data: {
        ...updateData,
        updatedAt: new Date(),
      }
    });
  },

  async delete(sessionId, userId) {
    return await prisma.chatSession.deleteMany({
      where: {
        id: sessionId,
        userId, // Ensure user owns the session
      }
    });
  },

  async deleteOldSessions(userId, daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return await prisma.chatSession.deleteMany({
      where: {
        userId,
        updatedAt: {
          lt: cutoffDate
        }
      }
    });
  }
};

// User preferences operations
const preferencesService = {
  async get(userId) {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId }
    });
    
    // Return default preferences if none exist
    if (!preferences) {
      return await this.create(userId, {});
    }
    
    return preferences;
  },

  async create(userId, preferencesData) {
    const defaultPreferences = {
      theme: 'system',
      language: 'en',
      voiceEnabled: false,
      notificationsEnabled: true,
      customSettings: {},
      ...preferencesData
    };

    return await prisma.userPreferences.create({
      data: {
        userId,
        ...defaultPreferences,
      }
    });
  },

  async update(userId, preferencesData) {
    return await prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...preferencesData,
      },
      update: preferencesData,
    });
  }
};

// Usage statistics
const usageStatsService = {
  async record(userId, feature, metadata = {}) {
    return await prisma.usageStats.create({
      data: {
        userId,
        feature,
        tokensUsed: metadata.tokensUsed || 0,
        requestsCount: metadata.requestsCount || 1,
        sessionDuration: metadata.sessionDuration,
        metadata: metadata.additionalData || {},
      }
    });
  },

  async getByUser(userId, startDate, endDate) {
    const where = { userId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return await prisma.usageStats.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  },

  async getAggregatedStats(userId, groupBy = 'day') {
    // This would need raw SQL for complex aggregations
    // For now, return basic stats
    return await prisma.usageStats.groupBy({
      by: ['feature'],
      where: { userId },
      _sum: {
        tokensUsed: true,
        requestsCount: true,
      },
      _count: true,
    });
  }
};

// Document operations
const documentService = {
  async create(documentData) {
    return await prisma.document.create({
      data: documentData
    });
  },

  async findMany(filters = {}, limit = 50, offset = 0) {
    const where = {};
    
    if (filters.contentType) where.contentType = filters.contentType;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters.tags) {
      where.tags = {
        contains: filters.tags
      };
    }

    return await prisma.document.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id) {
    return await prisma.document.findUnique({
      where: { id }
    });
  },

  async update(id, updateData) {
    return await prisma.document.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id) {
    return await prisma.document.delete({
      where: { id }
    });
  }
};

// Audit logging
const auditService = {
  async log(logData) {
    const { userId, action, resource, metadata, ipAddress, userAgent } = logData;
    
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        metadata: metadata || {},
        ipAddress,
        userAgent,
      }
    });
  },

  async getLogs(filters = {}, limit = 100, offset = 0) {
    const where = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return await prisma.auditLog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }
};

// API Key management
const apiKeyService = {
  async create(keyData) {
    const { name, permissions, expiresAt } = keyData;
    const keyValue = uuidv4();
    const keyHash = await bcrypt.hash(keyValue, 10);

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        permissions,
        expiresAt,
      }
    });

    // Return the plain key only once
    return { ...apiKey, key: keyValue };
  },

  async findByKey(key) {
    const allKeys = await prisma.apiKey.findMany({
      where: { isActive: true }
    });

    for (const apiKey of allKeys) {
      const isValid = await bcrypt.compare(key, apiKey.keyHash);
      if (isValid) {
        // Update last used
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() }
        });
        return apiKey;
      }
    }
    
    return null;
  },

  async revoke(id) {
    return await prisma.apiKey.update({
      where: { id },
      data: { isActive: false }
    });
  }
};

// Health check and maintenance
const maintenanceService = {
  async healthCheck() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  },

  async cleanupOldSessions(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await prisma.chatSession.deleteMany({
      where: {
        updatedAt: {
          lt: cutoffDate
        }
      }
    });
    
    return { deleted: result.count };
  },

  async cleanupOldLogs(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    
    return { deleted: result.count };
  }
};

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  userService,
  chatSessionService,
  preferencesService,
  usageStatsService,
  documentService,
  auditService,
  apiKeyService,
  maintenanceService,
};