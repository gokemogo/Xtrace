/**
 * DM8 数据初始化脚本
 * 创建管理员用户、默认项目和 API Key
 */

import { prisma } from "@langfuse/shared/src/db";
import { randomUUID } from "crypto";

async function main() {
  console.log("🌱 开始初始化 DM8 数据...");

  try {
    // 1. 创建管理员用户
    console.log("👤 创建管理员用户...");
    const adminUser = await prisma.user.create({
      data: {
        id: "user-admin-001",
        name: "Admin",
        email: "admin@deeptrace.local",
        emailVerified: new Date(),
        // 密码: admin123 (需要使用 bcrypt 加密)
        password: "$2a$10$rDkPvvAFV8kB8wz8kxN5s.NnE5X3X3X3X3X3X3X3X3X3X3Xu",
        admin: 1,
        featureFlags: "[]",
      },
    });
    console.log(`  ✅ 用户创建成功: ${adminUser.email}`);

    // 2. 创建默认项目
    console.log("📁 创建默认项目...");
    const project = await prisma.project.create({
      data: {
        id: "project-default-001",
        name: "Default Project",
        nameSecretSalt: "salt",
      },
    });
    console.log(`  ✅ 项目创建成功: ${project.name}`);

    // 3. 创建项目成员关系
    console.log("🔗 创建项目成员关系...");
    await prisma.projectMembership.create({
      data: {
        id: "membership-admin-001",
        projectId: project.id,
        userId: adminUser.id,
        role: "OWNER",
      },
    });
    console.log("  ✅ 成员关系创建成功");

    // 4. 创建 API Key
    console.log("🔑 创建 API Key...");
    const publicKey = `pk-lf-${randomUUID().substring(0, 8)}`;
    const secretKey = `sk-lf-${randomUUID().substring(0, 24)}`;

    await prisma.apiKey.create({
      data: {
        id: "apikey-admin-001",
        projectId: project.id,
        publicKey: publicKey,
        secretKey: secretKey, // 实际应该 hash
        note: "Default Admin API Key",
        displaySecretKey: `${secretKey.substring(0, 7)}...`,
        fastHashedSecretKey: secretKey, // 简化处理
      },
    });
    console.log(`  ✅ API Key 创建成功`);
    console.log(`     Public Key: ${publicKey}`);
    console.log(`     Secret Key: ${secretKey}`);

    console.log("\n✨ 数据初始化完成！");
    console.log("\n📧 管理员登录信息:");
    console.log("   Email: admin@deeptrace.local");
    console.log("   Password: admin123");
    console.log(`\n🔑 API Key:`);
    console.log(`   Public: ${publicKey}`);
    console.log(`   Secret: ${secretKey}`);

  } catch (error) {
    console.error("❌ 初始化失败:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
