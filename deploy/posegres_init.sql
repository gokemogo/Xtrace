-- 合并文件生成时间: 2025-10-28 10:17:37
-- 合并来源: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations 目录下所有子文件夹中的 migration.sql
-- ==================================================

-- ==================================================
-- 来源文件夹: 20230518191501_init
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230518191501_init\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "Example" (
                           "id" TEXT NOT NULL,
                           "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "updatedAt" TIMESTAMP(3) NOT NULL,

                           CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
                           "id" TEXT NOT NULL,
                           "userId" TEXT NOT NULL,
                           "type" TEXT NOT NULL,
                           "provider" TEXT NOT NULL,
                           "providerAccountId" TEXT NOT NULL,
                           "refresh_token" TEXT,
                           "access_token" TEXT,
                           "expires_at" INTEGER,
                           "token_type" TEXT,
                           "scope" TEXT,
                           "id_token" TEXT,
                           "session_state" TEXT,

                           CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
                           "id" TEXT NOT NULL,
                           "sessionToken" TEXT NOT NULL,
                           "userId" TEXT NOT NULL,
                           "expires" TIMESTAMP(3) NOT NULL,

                           CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
                        "id" TEXT NOT NULL,
                        "name" TEXT,
                        "email" TEXT,
                        "emailVerified" TIMESTAMP(3),
                        "image" TEXT,

                        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
                                     "identifier" TEXT NOT NULL,
                                     "token" TEXT NOT NULL,
                                     "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230518193415_add_observaionts_and_traces
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230518193415_add_observaionts_and_traces\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "traces" (
                          "id" TEXT NOT NULL,
                          "timestamp" TIMESTAMP(3) NOT NULL,
                          "name" TEXT NOT NULL,
                          "attributes" JSONB NOT NULL,
                          "status" TEXT NOT NULL,
                          "status_message" TEXT,

                          CONSTRAINT "traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
                                "id" TEXT NOT NULL,
                                "traceId" TEXT NOT NULL,
                                "name" TEXT NOT NULL,
                                "start_time" TIMESTAMP(3) NOT NULL,
                                "end_time" TIMESTAMP(3) NOT NULL,
                                "attributes" JSONB NOT NULL,
                                "parentObservationId" TEXT,

                                CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_parentObservationId_fkey" FOREIGN KEY ("parentObservationId") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230518193521_changes
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230518193521_changes\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the column `parentObservationId` on the `observations` table. All the data in the column will be lost.
  - Added the required column `type` to the `observations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "observations" DROP CONSTRAINT "observations_parentObservationId_fkey";

-- AlterTable
ALTER TABLE "observations" DROP COLUMN "parentObservationId",
ADD COLUMN     "parent_observation_id" TEXT,
ADD COLUMN     "type" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_parent_observation_id_fkey" FOREIGN KEY ("parent_observation_id") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230522092340_add_metrics_and_observation_types
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230522092340_add_metrics_and_observation_types\migration.sql
-- ==================================================

/*
  Warnings:

  - Changed the type of `type` on the `observations` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ObservationType" AS ENUM ('SPAN', 'EVENT', 'LLMCALL');

-- AlterTable
ALTER TABLE "observations" DROP COLUMN "type",
ADD COLUMN     "type" "ObservationType" NOT NULL;

-- CreateTable
CREATE TABLE "metrics" (
                           "id" TEXT NOT NULL,
                           "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "name" TEXT NOT NULL,
                           "value" INTEGER NOT NULL,
                           "traceId" TEXT NOT NULL,
                           "observationId" TEXT,

                           CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230522094431_endtime_optional
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230522094431_endtime_optional\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ALTER COLUMN "end_time" DROP NOT NULL;

-- ==================================================
-- 来源文件夹: 20230522131516_default_timestamp
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230522131516_default_timestamp\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the column `createdAt` on the `metrics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "metrics" DROP COLUMN "createdAt",
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "observations" ALTER COLUMN "start_time" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "traces" ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;

-- ==================================================
-- 来源文件夹: 20230523082455_rename_metrics_to_gradings
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230523082455_rename_metrics_to_gradings\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the `metrics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "metrics" DROP CONSTRAINT "metrics_observationId_fkey";

-- DropForeignKey
ALTER TABLE "metrics" DROP CONSTRAINT "metrics_traceId_fkey";

-- DropTable
DROP TABLE "metrics";

-- CreateTable
CREATE TABLE "gradings" (
                            "id" TEXT NOT NULL,
                            "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "name" TEXT NOT NULL,
                            "value" INTEGER NOT NULL,
                            "traceId" TEXT NOT NULL,
                            "observationId" TEXT,

                            CONSTRAINT "gradings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gradings" ADD CONSTRAINT "gradings_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230523084523_rename_to_score
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230523084523_rename_to_score\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the `gradings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "gradings" DROP CONSTRAINT "gradings_observationId_fkey";

-- DropForeignKey
ALTER TABLE "gradings" DROP CONSTRAINT "gradings_traceId_fkey";

-- DropTable
DROP TABLE "gradings";

-- CreateTable
CREATE TABLE "scores" (
                          "id" TEXT NOT NULL,
                          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "name" TEXT NOT NULL,
                          "value" INTEGER NOT NULL,
                          "traceId" TEXT NOT NULL,
                          "observationId" TEXT,

                          CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230529140133_user_add_pw
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230529140133_user_add_pw\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT;

-- ==================================================
-- 来源文件夹: 20230530204241_auth_api_ui
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230530204241_auth_api_ui\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the column `userId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Example` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Example` table. All the data in the column will be lost.
  - You are about to drop the column `sessionToken` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `traceId` on the `observations` table. All the data in the column will be lost.
  - You are about to drop the column `observationId` on the `scores` table. All the data in the column will be lost.
  - You are about to drop the column `traceId` on the `scores` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[session_token]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Example` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_token` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trace_id` to the `observations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trace_id` to the `scores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `traces` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "observations" DROP CONSTRAINT "observations_traceId_fkey";

-- DropForeignKey
ALTER TABLE "scores" DROP CONSTRAINT "scores_observationId_fkey";

-- DropForeignKey
ALTER TABLE "scores" DROP CONSTRAINT "scores_traceId_fkey";

-- DropIndex
DROP INDEX "Session_sessionToken_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "userId",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Example" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "sessionToken",
DROP COLUMN "userId",
ADD COLUMN     "session_token" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "observations" DROP COLUMN "traceId",
ADD COLUMN     "trace_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "scores" DROP COLUMN "observationId",
DROP COLUMN "traceId",
ADD COLUMN     "observation_id" TEXT,
ADD COLUMN     "trace_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "traces" ADD COLUMN     "project_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "VerificationToken";

-- CreateTable
CREATE TABLE "users" (
                         "id" TEXT NOT NULL,
                         "name" TEXT,
                         "email" TEXT,
                         "email_verified" TIMESTAMP(3),
                         "password" TEXT,
                         "image" TEXT,

                         CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
                                       "identifier" TEXT NOT NULL,
                                       "token" TEXT NOT NULL,
                                       "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "projects" (
                            "id" TEXT NOT NULL,
                            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "name" TEXT NOT NULL,

                            CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
                            "id" TEXT NOT NULL,
                            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "note" TEXT,
                            "publishable_key" TEXT NOT NULL,
                            "hashed_secret_key" TEXT NOT NULL,
                            "display_secret_key" TEXT NOT NULL,
                            "last_used_at" TIMESTAMP(3),
                            "expires_at" TIMESTAMP(3),
                            "project_id" TEXT NOT NULL,

                            CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
                               "project_id" TEXT NOT NULL,
                               "user_id" TEXT NOT NULL,
                               "role" "MembershipRole" NOT NULL,

                               CONSTRAINT "memberships_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_id_key" ON "api_keys"("id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_publishable_key_key" ON "api_keys"("publishable_key");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_hashed_secret_key_key" ON "api_keys"("hashed_secret_key");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_token_key" ON "Session"("session_token");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traces" ADD CONSTRAINT "traces_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230618125818_remove_status_from_trace
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230618125818_remove_status_from_trace\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the column `status` on the `traces` table. All the data in the column will be lost.
  - You are about to drop the column `status_message` on the `traces` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "traces" DROP COLUMN "status",
DROP COLUMN "status_message";

-- ==================================================
-- 来源文件夹: 20230620181114_restructure
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230620181114_restructure\migration.sql
-- ==================================================

/*
  Warnings:
  - THIS IS BREAKING

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ObservationType_new" AS ENUM ('SPAN', 'EVENT', 'GENERATION');
ALTER TABLE "observations" ALTER COLUMN "type" TYPE "ObservationType_new" USING ("type"::text::"ObservationType_new");
ALTER TYPE "ObservationType" RENAME TO "ObservationType_old";
ALTER TYPE "ObservationType_new" RENAME TO "ObservationType";
DROP TYPE "ObservationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "observations" DROP COLUMN "attributes",
ADD COLUMN     "completion" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "modelParameters" JSONB,
ADD COLUMN     "prompt" JSONB,
ADD COLUMN     "usage" JSONB,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "traces" DROP COLUMN "attributes",
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "name" DROP NOT NULL;

-- ==================================================
-- 来源文件夹: 20230622114254_new_oservations
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230622114254_new_oservations\migration.sql
-- ==================================================

BEGIN;

ALTER TABLE "observations"
    RENAME COLUMN "prompt" TO "input";

ALTER TABLE "observations"
    ADD COLUMN "output_temp" JSONB;

UPDATE "observations"
SET "output_temp" = json_build_object('completion', "observations"."completion");

ALTER TABLE "observations" DROP COLUMN "completion";

ALTER TABLE "observations"
    RENAME COLUMN "output_temp" TO "output";

COMMIT;

-- ==================================================
-- 来源文件夹: 20230623172401_observation_add_level_and_status_message
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230623172401_observation_add_level_and_status_message\migration.sql
-- ==================================================

-- CreateEnum
CREATE TYPE "ObservationLevel" AS ENUM ('DEBUG', 'DEFAULT', 'WARNING', 'ERROR');

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "level" "ObservationLevel" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "status_message" TEXT;

-- ==================================================
-- 来源文件夹: 20230626095337_external_trace_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230626095337_external_trace_id\migration.sql
-- ==================================================

ALTER TABLE "traces" ADD COLUMN     "external_id" TEXT;
CREATE UNIQUE INDEX "traces_project_id_external_id_key" ON "traces"("project_id", "external_id");

-- ==================================================
-- 来源文件夹: 20230705160335_add_created_updated_timestamps
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230705160335_add_created_updated_timestamps\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ==================================================
-- 来源文件夹: 20230706195819_add_completion_start_time
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230706195819_add_completion_start_time\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "completion_start_time" TIMESTAMP(3);

-- ==================================================
-- 来源文件夹: 20230707132314_traces_project_id_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230707132314_traces_project_id_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "traces_project_id_idx" ON "traces"("project_id");

-- ==================================================
-- 来源文件夹: 20230707133415_user_add_email_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230707133415_user_add_email_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "Account_user_id_idx" ON "Account"("user_id");

-- ==================================================
-- 来源文件夹: 20230710105741_added_indices
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230710105741_added_indices\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX "traces_project_id_idx";

-- CreateIndex
CREATE INDEX "observations_trace_id_type_idx" ON "observations"("trace_id", "type");

-- CreateIndex
CREATE INDEX "scores_value_idx" ON "scores"("value");

-- CreateIndex
CREATE INDEX "traces_project_id_name_idx" ON "traces"("project_id", "name");

-- ==================================================
-- 来源文件夹: 20230710114928_traces_add_user_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230710114928_traces_add_user_id\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX "traces_project_id_name_idx";

-- AlterTable
ALTER TABLE "traces" ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "traces_project_id_name_user_id_idx" ON "traces"("project_id", "name", "user_id");

-- ==================================================
-- 来源文件夹: 20230710200816_scores_add_comment
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230710200816_scores_add_comment\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "comment" TEXT;

-- ==================================================
-- 来源文件夹: 20230711104810_traces_add_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230711104810_traces_add_index\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX "traces_project_id_name_user_id_idx";

-- CreateIndex
CREATE INDEX "traces_project_id_name_user_id_external_id_idx" ON "traces"("project_id", "name", "user_id", "external_id");

-- ==================================================
-- 来源文件夹: 20230711110517_memberships_add_userid_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230711110517_memberships_add_userid_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- ==================================================
-- 来源文件夹: 20230711112235_fix_indices
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230711112235_fix_indices\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX "observations_trace_id_type_idx";

-- DropIndex
DROP INDEX "traces_project_id_name_user_id_external_id_idx";

-- CreateIndex
CREATE INDEX "observations_trace_id_idx" ON "observations"("trace_id");

-- CreateIndex
CREATE INDEX "observations_type_idx" ON "observations"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "traces_project_id_idx" ON "traces"("project_id");

-- CreateIndex
CREATE INDEX  "traces_name_idx" ON "traces"("name");

-- CreateIndex
CREATE INDEX "traces_user_id_idx" ON "traces"("user_id");

-- CreateIndex
CREATE INDEX "traces_external_id_idx" ON "traces"("external_id");

-- ==================================================
-- 来源文件夹: 20230717190411_users_feature_flags
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230717190411_users_feature_flags\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "feature_flags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ==================================================
-- 来源文件夹: 20230720162550_tokens
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230720162550_tokens\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "completion_tokens" INTEGER,
ADD COLUMN     "prompt_tokens" INTEGER,
ADD COLUMN     "total_tokens" INTEGER;

-- ==================================================
-- 来源文件夹: 20230720164603_migrate_tokens
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230720164603_migrate_tokens\migration.sql
-- ==================================================

-- This is an empty migration.
UPDATE observations
SET prompt_tokens = CAST(usage::json->>'promptTokens' AS INTEGER),
    completion_tokens = CAST(usage::json->>'completionTokens' AS INTEGER),
    total_tokens = CAST(usage::json->>'totalTokens' AS INTEGER);

-- ==================================================
-- 来源文件夹: 20230720172051_tokens_non_null
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230720172051_tokens_non_null\migration.sql
-- ==================================================

/*
  Warnings:

  - Made the column `completion_tokens` on table `observations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `prompt_tokens` on table `observations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_tokens` on table `observations` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
UPDATE observations SET prompt_tokens = COALESCE(prompt_tokens, 0);
UPDATE observations SET completion_tokens = COALESCE(completion_tokens, 0);
UPDATE observations SET total_tokens = COALESCE(total_tokens, 0);

ALTER TABLE "observations"
    ALTER COLUMN "completion_tokens" SET DEFAULT 0,
ALTER COLUMN "prompt_tokens" SET DEFAULT 0,
ALTER COLUMN "total_tokens" SET DEFAULT 0,
ALTER COLUMN "completion_tokens" SET NOT NULL,
ALTER COLUMN "prompt_tokens" SET NOT NULL,
ALTER COLUMN "total_tokens" SET NOT NULL;

-- ==================================================
-- 来源文件夹: 20230721111651_drop_usage_json
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230721111651_drop_usage_json\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the column `usage` on the `observations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "observations" DROP COLUMN "usage";

-- ==================================================
-- 来源文件夹: 20230731162154_score_value_float
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230731162154_score_value_float\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "scores" ALTER COLUMN "value" SET DATA TYPE DOUBLE PRECISION;

-- ==================================================
-- 来源文件夹: 20230803093326_add_release_and_version
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230803093326_add_release_and_version\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "version" TEXT;

-- AlterTable
ALTER TABLE "traces" ADD COLUMN     "release" TEXT,
ADD COLUMN     "version" TEXT;

-- ==================================================
-- 来源文件夹: 20230809093636_remove_foreign_keys
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230809093636_remove_foreign_keys\migration.sql
-- ==================================================

-- DropForeignKey
ALTER TABLE "observations" DROP CONSTRAINT "observations_parent_observation_id_fkey";

-- DropForeignKey
ALTER TABLE "observations" DROP CONSTRAINT "observations_trace_id_fkey";

-- ==================================================
-- 来源文件夹: 20230809132331_add_project_id_to_observations
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230809132331_add_project_id_to_observations\migration.sql
-- ==================================================

/*
  Warnings:

  - Added the required column `project_id` to the `observations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "project_id" TEXT;

-- Backfill data in the new column
UPDATE "observations" o
SET "project_id" = t."project_id"
    FROM "traces" t
WHERE o."trace_id" = t."id";

-- To be applied in separate migration after application release to minimize ingestion downtime
-- ALTER TABLE "observations"
-- ALTER COLUMN "project_id" SET NOT NULL;


-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230810191452_traceid_nullable_on_observations
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230810191452_traceid_nullable_on_observations\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ALTER COLUMN "trace_id" DROP NOT NULL;

-- ==================================================
-- 来源文件夹: 20230810191453_project_id_not_null
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230810191453_project_id_not_null\migration.sql
-- ==================================================

-- Applied in separate migration after application release to minimize ingestion downtime
ALTER TABLE "observations"
    ALTER COLUMN "project_id" SET NOT NULL;

-- ==================================================
-- 来源文件夹: 20230814184705_add_viewer_membership_role
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230814184705_add_viewer_membership_role\migration.sql
-- ==================================================

-- AlterEnum
ALTER TYPE "MembershipRole" ADD VALUE 'VIEWER';

-- ==================================================
-- 来源文件夹: 20230901155252_add_pricings_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230901155252_add_pricings_table\migration.sql
-- ==================================================

-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('PER_1000_TOKENS');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('PROMPT', 'COMPLETION', 'TOTAL');

-- CreateTable
CREATE TABLE "pricings" (
                            "id" TEXT NOT NULL,
                            "model_name" TEXT NOT NULL,
                            "pricing_unit" "PricingUnit" NOT NULL DEFAULT 'PER_1000_TOKENS',
                            "price" DECIMAL(65,30) NOT NULL,
                            "currency" TEXT NOT NULL DEFAULT 'USD',
                            "token_type" "TokenType" NOT NULL,

                            CONSTRAINT "pricings_pkey" PRIMARY KEY ("id")
);

-- ==================================================
-- 来源文件夹: 20230901155336_add_pricing_data
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230901155336_add_pricing_data\migration.sql
-- ==================================================


-- This migration adds default prices for the models that are currently available on the LANGCHAIN platform.
-- https://github.com/langchain-ai/langchain/blob/e60e1cdf23ad73b2e0a40034c0ddfc3c8b0c9c4d/libs/langchain/langchain/callbacks/openai_info.py#L7

INSERT INTO pricings (
    id,
    model_name,
    pricing_unit,
    price,
    currency,
    token_type
)
VALUES
    ('clm0obv1u00003b6lc9etkzfg','gpt-4', 'PER_1000_TOKENS', 0.03, 'USD', 'PROMPT'),
    ('clm0obv1u00013b6l4jdl83vs','gpt-4-0314', 'PER_1000_TOKENS', 0.03, 'USD', 'PROMPT'),
    ('clm0obv1u00023b6lsi1d24dh','gpt-4-0613', 'PER_1000_TOKENS', 0.03, 'USD', 'PROMPT'),
    ('clm0obv1u00033b6lvv4h0iex','gpt-4-32k', 'PER_1000_TOKENS', 0.06, 'USD', 'PROMPT'),
    ('clm0obv1u00043b6ln5pleunh','gpt-4-32k-0314', 'PER_1000_TOKENS', 0.06, 'USD', 'PROMPT'),
    ('clm0obv1u00053b6l0g4zo5oe','gpt-4-32k-0613', 'PER_1000_TOKENS', 0.06, 'USD', 'PROMPT'),
    ('clm0obv1u00063b6lv7y80efe','gpt-4', 'PER_1000_TOKENS', 0.06, 'USD', 'COMPLETION'),
    ('clm0obv1u00073b6l302roky7','gpt-4-0314', 'PER_1000_TOKENS', 0.06, 'USD', 'COMPLETION'),
    ('clm0obv1u00083b6laz822qt4','gpt-4-0613', 'PER_1000_TOKENS', 0.06, 'USD', 'COMPLETION'),
    ('clm0obv1u00093b6l9ivm2fbs','gpt-4-32k', 'PER_1000_TOKENS', 0.12, 'USD', 'COMPLETION'),
    ('clm0obv1u000a3b6l7ou8mq4o','gpt-4-32k-0314', 'PER_1000_TOKENS', 0.12, 'USD', 'COMPLETION'),
    ('clm0obv1u000b3b6lym69vmpx','gpt-4-32k-0613', 'PER_1000_TOKENS', 0.12, 'USD', 'COMPLETION'),
    ('clm0obv1u000c3b6lfeg8e6gh','gpt-3.5-turbo', 'PER_1000_TOKENS', 0.0015, 'USD', 'PROMPT'),
    ('clm0obv1u000d3b6lb8ww3uj2','gpt-3.5-turbo-0301', 'PER_1000_TOKENS', 0.0015, 'USD', 'PROMPT'),
    ('clm0obv1u000e3b6lznniclze','gpt-3.5-turbo-0613', 'PER_1000_TOKENS', 0.0015, 'USD', 'PROMPT'),
    ('clm0obv1u000f3b6lr2bxjnxr','gpt-3.5-turbo-16k', 'PER_1000_TOKENS', 0.003, 'USD', 'PROMPT'),
    ('clm0obv1u000g3b6lo3rqrgpj','gpt-3.5-turbo-16k-0613', 'PER_1000_TOKENS', 0.003, 'USD', 'PROMPT'),
    ('clm0obv1u000h3b6lt1l33gpm','gpt-3.5-turbo', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clm0obv1u000i3b6lgfs7pi5b','gpt-3.5-turbo-0301', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clm0obv1u000j3b6lg1jokl07','gpt-3.5-turbo-0613', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clm0obv1u000k3b6lgfntsm74','gpt-3.5-turbo-16k', 'PER_1000_TOKENS', 0.004, 'USD', 'COMPLETION'),
    ('clm0obv1u000l3b6l8wjhn0ie','gpt-3.5-turbo-16k-0613', 'PER_1000_TOKENS', 0.004, 'USD', 'COMPLETION'),
    ('clm0obv1u000m3b6lgrcel0ce','gpt-35-turbo', 'PER_1000_TOKENS', 0.0015, 'USD', 'PROMPT'),
    ('clm0obv1u000n3b6lw3bc6q70','gpt-35-turbo-0301', 'PER_1000_TOKENS', 0.0015, 'USD', 'PROMPT'),
    ('clm0obv1u000o3b6luimelud7','gpt-35-turbo-0613', 'PER_1000_TOKENS', 0.0015, 'USD', 'PROMPT'),
    ('clm0obv1u000p3b6lft9rfj1h','gpt-35-turbo-16k', 'PER_1000_TOKENS', 0.003, 'USD', 'PROMPT'),
    ('clm0obv1u000q3b6l1zh6x8lu','gpt-35-turbo-16k-0613', 'PER_1000_TOKENS', 0.003, 'USD', 'PROMPT'),
    ('clm0obv1v000r3b6llobngoj3','gpt-35-turbo', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clm0obv1v000s3b6lgcjqu15e','gpt-35-turbo-0301', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clm0obv1v000t3b6l6ijo29gd','gpt-35-turbo-0613', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clm0obv1v000u3b6lo16c29a1','gpt-35-turbo-16k', 'PER_1000_TOKENS', 0.004, 'USD', 'COMPLETION'),
    ('clm0obv1v000v3b6leqypomnv','gpt-35-turbo-16k-0613', 'PER_1000_TOKENS', 0.004, 'USD', 'COMPLETION'),
    ('clm0obv1v000w3b6l6y0ojr1j','text-ada-001', 'PER_1000_TOKENS', 0.0004, 'USD', 'TOTAL'),
    ('clm0obv1v000x3b6lwdjl5os6','ada', 'PER_1000_TOKENS', 0.0004, 'USD', 'TOTAL'),
    ('clm0obv1v000y3b6lsap2cbkj','text-babbage-001', 'PER_1000_TOKENS', 0.0005, 'USD', 'TOTAL'),
    ('clm0obv1v000z3b6lto21j3xd','babbage', 'PER_1000_TOKENS', 0.0005, 'USD', 'TOTAL'),
    ('clm0obv1v00103b6lges5uumn','text-curie-001', 'PER_1000_TOKENS', 0.002, 'USD', 'TOTAL'),
    ('clm0obv1v00113b6l2vizhjhc','curie', 'PER_1000_TOKENS', 0.002, 'USD', 'TOTAL'),
    ('clm0obv1v00123b6lqb7mfrzr','text-davinci-003', 'PER_1000_TOKENS', 0.02, 'USD', 'TOTAL'),
    ('clm0obv1v00133b6lnqa8ecal','text-davinci-002', 'PER_1000_TOKENS', 0.02, 'USD', 'TOTAL'),
    ('clm0obv1v00143b6l6z5s44sf','code-davinci-002', 'PER_1000_TOKENS', 0.02, 'USD', 'TOTAL'),
    ('clm0obv1v00153b6lyntq7lx0','ada-finetuned', 'PER_1000_TOKENS', 0.0016, 'USD', 'TOTAL'),
    ('clm0obv1v00163b6l5fsheo7p','babbage-finetuned', 'PER_1000_TOKENS', 0.0024, 'USD', 'TOTAL'),
    ('clm0obv1v00173b6lly0887fz','curie-finetuned', 'PER_1000_TOKENS', 0.012, 'USD', 'TOTAL'),
    ('clm0obv1v00183b6lg20tw4g4','davinci-finetuned', 'PER_1000_TOKENS', 0.12, 'USD', 'TOTAL');

-- ==================================================
-- 来源文件夹: 20230907204921_add_cron_jobs_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230907204921_add_cron_jobs_table\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "cron_jobs" (
                             "name" TEXT NOT NULL,
                             "last_run" TIMESTAMP(3),

                             CONSTRAINT "cron_jobs_pkey" PRIMARY KEY ("name")
);

-- ==================================================
-- 来源文件夹: 20230907225603_projects_updated_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230907225603_projects_updated_at\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ==================================================
-- 来源文件夹: 20230907225604_api_keys_publishable_to_public
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230907225604_api_keys_publishable_to_public\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX "api_keys_publishable_key_key";

-- RENAME column from "publishable_key" to "public_key" on table "api_keys"
ALTER TABLE "api_keys" rename column "publishable_key" to "public_key";

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_public_key_key" ON "api_keys"("public_key");

-- ==================================================
-- 来源文件夹: 20230910164603_cron_add_state
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230910164603_cron_add_state\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "cron_jobs" ADD COLUMN     "state" TEXT;

-- ==================================================
-- 来源文件夹: 20230912115644_add_trace_public_bool
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230912115644_add_trace_public_bool\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "traces" ADD COLUMN     "public" BOOLEAN NOT NULL DEFAULT false;

-- ==================================================
-- 来源文件夹: 20230918180320_add_indices
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230918180320_add_indices\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "observations_start_time_idx" ON "observations"("start_time");

-- CreateIndex
CREATE INDEX "traces_timestamp_idx" ON "traces"("timestamp");

-- ==================================================
-- 来源文件夹: 20230922030325_add_observation_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230922030325_add_observation_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "observations_project_id_idx" ON "observations"("project_id");

-- ==================================================
-- 来源文件夹: 20230924232619_datasets_init
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230924232619_datasets_init\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "datasets" (
                            "id" TEXT NOT NULL,
                            "name" TEXT NOT NULL,
                            "project_id" TEXT NOT NULL,
                            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_items" (
                                 "id" TEXT NOT NULL,
                                 "input" JSONB,
                                 "expected_output" JSONB,
                                 "source_observation_id" TEXT,
                                 "dataset_id" TEXT NOT NULL,
                                 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                 CONSTRAINT "dataset_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_runs" (
                                "id" TEXT NOT NULL,
                                "name" TEXT NOT NULL,
                                "dataset_id" TEXT NOT NULL,
                                "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                CONSTRAINT "dataset_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_run_items" (
                                     "id" TEXT NOT NULL,
                                     "dataset_run_id" TEXT NOT NULL,
                                     "dataset_item_id" TEXT NOT NULL,
                                     "observation_id" TEXT NOT NULL,
                                     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                     CONSTRAINT "dataset_run_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_source_observation_id_fkey" FOREIGN KEY ("source_observation_id") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_runs" ADD CONSTRAINT "dataset_runs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_dataset_run_id_fkey" FOREIGN KEY ("dataset_run_id") REFERENCES "dataset_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_dataset_item_id_fkey" FOREIGN KEY ("dataset_item_id") REFERENCES "dataset_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20230924232620_datasets_continued
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20230924232620_datasets_continued\migration.sql
-- ==================================================

/*
  Warnings:

  - A unique constraint covering the columns `[dataset_id,name]` on the table `dataset_runs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[project_id,name]` on the table `datasets` will be added. If there are existing duplicate values, this will fail.
  - Made the column `input` on table `dataset_items` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "dataset_items" ADD COLUMN     "status" "DatasetStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "input" SET NOT NULL;

-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "status" "DatasetStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "dataset_runs_dataset_id_name_key" ON "dataset_runs"("dataset_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "datasets_project_id_name_key" ON "datasets"("project_id", "name");

-- ==================================================
-- 来源文件夹: 20231004005909_add_parent_observation_id_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231004005909_add_parent_observation_id_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "observations_parent_observation_id_idx" ON "observations"("parent_observation_id");

-- ==================================================
-- 来源文件夹: 20231005064433_add_release_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231005064433_add_release_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "traces_release_idx" ON "traces"("release");

-- ==================================================
-- 来源文件夹: 20231009095917_add_ondelete_cascade
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231009095917_add_ondelete_cascade\migration.sql
-- ==================================================

-- DropForeignKey
ALTER TABLE "dataset_run_items" DROP CONSTRAINT "dataset_run_items_dataset_item_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_run_items" DROP CONSTRAINT "dataset_run_items_dataset_run_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_run_items" DROP CONSTRAINT "dataset_run_items_observation_id_fkey";

-- DropForeignKey
ALTER TABLE "dataset_runs" DROP CONSTRAINT "dataset_runs_dataset_id_fkey";

-- DropForeignKey
ALTER TABLE "observations" DROP CONSTRAINT "observations_project_id_fkey";

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_runs" ADD CONSTRAINT "dataset_runs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_dataset_run_id_fkey" FOREIGN KEY ("dataset_run_id") REFERENCES "dataset_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_dataset_item_id_fkey" FOREIGN KEY ("dataset_item_id") REFERENCES "dataset_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20231012161041_add_events_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231012161041_add_events_table\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "events" (
                          "id" TEXT NOT NULL,
                          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "project_id" TEXT NOT NULL,
                          "data" JSONB NOT NULL,
                          "url" TEXT,
                          "method" TEXT,

                          CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20231014131841_users_add_admin_flag
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231014131841_users_add_admin_flag\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "admin" BOOLEAN NOT NULL DEFAULT false;

-- ==================================================
-- 来源文件夹: 20231018130032_add_per_1000_chars_pricing
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231018130032_add_per_1000_chars_pricing\migration.sql
-- ==================================================

-- AlterEnum
ALTER TYPE "PricingUnit" ADD VALUE 'PER_1000_CHARS';

-- ==================================================
-- 来源文件夹: 20231019094815_add_additional_secret_key_column
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231019094815_add_additional_secret_key_column\migration.sql
-- ==================================================

/*
  Warnings:

  - A unique constraint covering the columns `[fast_hashed_secret_key]` on the table `api_keys` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "fast_hashed_secret_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_fast_hashed_secret_key_key" ON "api_keys"("fast_hashed_secret_key");

-- CreateIndex
CREATE INDEX "api_keys_project_id_idx" ON "api_keys"("project_id");

-- CreateIndex
CREATE INDEX "api_keys_public_key_idx" ON "api_keys"("public_key");

-- CreateIndex
CREATE INDEX "api_keys_hashed_secret_key_idx" ON "api_keys"("hashed_secret_key");

-- CreateIndex
CREATE INDEX "api_keys_fast_hashed_secret_key_idx" ON "api_keys"("fast_hashed_secret_key");

-- ==================================================
-- 来源文件夹: 20231021182825_user_emails_all_lowercase
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231021182825_user_emails_all_lowercase\migration.sql
-- ==================================================

-- Due to the unique constraint on the email column, we need to make sure that all emails are in lowercase.
-- This migration will update all existing emails to be lowercase.
-- This migration fails if there are duplicate emails in the database.

UPDATE "users" SET "email" = LOWER("email");

-- ==================================================
-- 来源文件夹: 20231025153548_add_headers_to_events
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231025153548_add_headers_to_events\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "headers" JSONB NOT NULL DEFAULT '{}';

-- ==================================================
-- 来源文件夹: 20231030184329_events_add_index_on_projectid
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231030184329_events_add_index_on_projectid\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "events_project_id_idx" ON "events"("project_id");

-- ==================================================
-- 来源文件夹: 20231104004529_scores_add_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231104004529_scores_add_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "scores_trace_id_idx" ON "scores" USING HASH ("trace_id");

-- CreateIndex
CREATE INDEX "scores_observation_id_idx" ON "scores" USING HASH ("observation_id");

-- ==================================================
-- 来源文件夹: 20231104005403_fkey_indicies
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231104005403_fkey_indicies\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "dataset_items_source_observation_id_idx" ON "dataset_items" USING HASH ("source_observation_id");

-- CreateIndex
CREATE INDEX "dataset_items_dataset_id_idx" ON "dataset_items" USING HASH ("dataset_id");

-- CreateIndex
CREATE INDEX "dataset_run_items_dataset_run_id_idx" ON "dataset_run_items" USING HASH ("dataset_run_id");

-- CreateIndex
CREATE INDEX "dataset_run_items_dataset_item_id_idx" ON "dataset_run_items" USING HASH ("dataset_item_id");

-- CreateIndex
CREATE INDEX "dataset_run_items_observation_id_idx" ON "dataset_run_items" USING HASH ("observation_id");

-- CreateIndex
CREATE INDEX "dataset_runs_dataset_id_idx" ON "dataset_runs" USING HASH ("dataset_id");

-- CreateIndex
CREATE INDEX "datasets_project_id_idx" ON "datasets" USING HASH ("project_id");

-- ==================================================
-- 来源文件夹: 20231106213824_add_openai_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231106213824_add_openai_models\migration.sql
-- ==================================================

-- This is an empty migration.

INSERT INTO pricings (
    id,
    model_name,
    pricing_unit,
    price,
    currency,
    token_type
)
VALUES
    ('clm0obv1u00003b6lc2etkzfu','gpt-4-1106-preview', 'PER_1000_TOKENS', 0.01, 'USD', 'PROMPT'),
    ('clm0obv1u00003b6lc2etkzfg','gpt-4-1106-preview', 'PER_1000_TOKENS', 0.03, 'USD', 'COMPLETION'),
    ('clm0obv1u00013b6l4gdl83vs','gpt-4-1106-vision-preview	', 'PER_1000_TOKENS', 0.01, 'USD', 'PROMPT'),
    ('clm0obv1u00013b6l4gjl83vs','gpt-4-1106-vision-preview	', 'PER_1000_TOKENS', 0.03, 'USD', 'COMPLETION');

-- ==================================================
-- 来源文件夹: 20231110012457_observation_created_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231110012457_observation_created_at\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ==================================================
-- 来源文件夹: 20231110012829_observation_created_at_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231110012829_observation_created_at_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "observations_created_at_idx" ON "observations"("created_at");

-- ==================================================
-- 来源文件夹: 20231112095703_observations_add_unique_constraint
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231112095703_observations_add_unique_constraint\migration.sql
-- ==================================================

/*
  Warnings:

  - A unique constraint covering the columns `[id,project_id]` on the table `observations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "observations_id_project_id_key" ON "observations"("id", "project_id");

-- ==================================================
-- 来源文件夹: 20231116005353_scores_unique_id_projectid
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231116005353_scores_unique_id_projectid\migration.sql
-- ==================================================

/*
  Warnings:

  - A unique constraint covering the columns `[id,trace_id]` on the table `scores` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "scores_id_trace_id_key" ON "scores"("id", "trace_id");

-- ==================================================
-- 来源文件夹: 20231119171939_cron_add_job_started_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231119171939_cron_add_job_started_at\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "cron_jobs" ADD COLUMN     "job_started_at" TIMESTAMP(3);

-- ==================================================
-- 来源文件夹: 20231119171940_bookmarked
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231119171940_bookmarked\migration.sql
-- ==================================================


-- AlterTable
ALTER TABLE "traces" ADD COLUMN "bookmarked" BOOLEAN NOT NULL DEFAULT false;

-- ==================================================
-- 来源文件夹: 20231129013314_invites
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231129013314_invites\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "membership_invitations" (
                                          "id" TEXT NOT NULL,
                                          "email" TEXT NOT NULL,
                                          "role" "MembershipRole" NOT NULL,
                                          "project_id" TEXT NOT NULL,
                                          "sender_id" TEXT,
                                          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                          CONSTRAINT "membership_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_invitations_id_key" ON "membership_invitations"("id");

-- CreateIndex
CREATE INDEX "membership_invitations_project_id_idx" ON "membership_invitations"("project_id");

-- CreateIndex
CREATE INDEX "membership_invitations_email_idx" ON "membership_invitations"("email");

-- AddForeignKey
ALTER TABLE "membership_invitations" ADD CONSTRAINT "membership_invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_invitations" ADD CONSTRAINT "membership_invitations_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20231130003317_trace_session_input_output
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231130003317_trace_session_input_output\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "traces" ADD COLUMN     "input" JSONB,
ADD COLUMN     "output" JSONB,
ADD COLUMN     "session_id" TEXT;

-- CreateTable
CREATE TABLE "trace_sessions" (
                                  "id" TEXT NOT NULL,
                                  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "project_id" TEXT NOT NULL,
                                  "bookmarked" BOOLEAN NOT NULL DEFAULT false,
                                  "public" BOOLEAN NOT NULL DEFAULT false,

                                  CONSTRAINT "trace_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trace_sessions_project_id_idx" ON "trace_sessions"("project_id");

-- CreateIndex
CREATE INDEX "trace_sessions_created_at_idx" ON "trace_sessions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "trace_sessions_id_project_id_key" ON "trace_sessions"("id", "project_id");

-- CreateIndex
CREATE INDEX "traces_session_id_idx" ON "traces"("session_id");

-- AddForeignKey
ALTER TABLE "trace_sessions" ADD CONSTRAINT "trace_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traces" ADD CONSTRAINT "traces_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "trace_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20231204223505_add_unit_to_observations
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231204223505_add_unit_to_observations\migration.sql
-- ==================================================

-- AlterTable
-- Adding this migration does not lock the postgres table. For non volaitile data, the default value is stored in the
-- table metadata and accessed on read query time. No table re-write is required (https://www.postgresql.org/docs/current/sql-altertable.html#:~:text=When%20a%20column%20is%20added,is%20specified%2C%20NULL%20is%20used.)
ALTER TABLE "observations" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'TOKENS';

-- ==================================================
-- 来源文件夹: 20231223230007_cloud_config
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231223230007_cloud_config\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "cloud_config" JSONB;

-- ==================================================
-- 来源文件夹: 20231223230008_accounts_add_cols_azure_ad_auth
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231223230008_accounts_add_cols_azure_ad_auth\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "expires_in" INTEGER,
ADD COLUMN     "ext_expires_in" INTEGER;

-- ==================================================
-- 来源文件夹: 20231230151856_add_prompt_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20231230151856_add_prompt_table\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "prompt_id" TEXT;

-- CreateTable
CREATE TABLE "prompts" (
                           "id" TEXT NOT NULL,
                           "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "project_id" TEXT NOT NULL,
                           "created_by" TEXT NOT NULL,
                           "prompt" TEXT NOT NULL,
                           "name" TEXT NOT NULL,
                           "version" INTEGER NOT NULL,
                           "is_active" BOOLEAN NOT NULL,

                           CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompts_project_id_name_version_idx" ON "prompts"("project_id", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "prompts_project_id_name_version_key" ON "prompts"("project_id", "name", "version");

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240103135918_add_pricings
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240103135918_add_pricings\migration.sql
-- ==================================================

-- Migration to add gpt-3.5-turbo-1106 and gpt-3.5-turbo-instruct models

INSERT INTO pricings (
    id,
    model_name,
    pricing_unit,
    price,
    currency,
    token_type
)
VALUES
    ('clqqpc2pr000008l3hvy63gxy','gpt-3.5-turbo-1106', 'PER_1000_TOKENS', 0.001, 'USD', 'PROMPT'),
    ('clqqpcb6d000208l3atrfbmou','gpt-3.5-turbo-1106', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clqqpdh45000008lfgrnx76cv','gpt-3.5-turbo-instruct', 'PER_1000_TOKENS', 0.0015, 'USD', 'PROMPT'),
    ('clqqpdjya000108lf3s4b4c4m','gpt-3.5-turbo-instruct', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clnnuiuq6000008l4dxp43wc6', 'claude-instant-1.2', 'PER_1000_TOKENS', 0.00163, 'USD', 'PROMPT'),
    ('clnnujlmj000108l48wne4ii9', 'claude-instant-1.2', 'PER_1000_TOKENS', 0.00551, 'USD', 'COMPLETION'),
    ('clnnukutg000208l49qqt9lyr', 'claude-instant-1.1', 'PER_1000_TOKENS', 0.00163, 'USD', 'PROMPT'),
    ('clnnun3x3000408l490qz9uv0', 'claude-instant-1.1', 'PER_1000_TOKENS', 0.00551, 'USD', 'COMPLETION'),
    ('clnnuosvy000508l4gsjy2pp4', 'claude-2.0', 'PER_1000_TOKENS', 0.01102, 'USD', 'PROMPT'),
    ('clnnuqcns000608l40qaz8trt', 'claude-2.0', 'PER_1000_TOKENS', 0.03268, 'USD', 'COMPLETION'),
    ('clnnuuif8000808l4gal4fjq4', 'claude-1.0', 'PER_1000_TOKENS', 0.01102, 'USD', 'PROMPT'),
    ('clnnutptp000708l47r091vvd', 'claude-1.0', 'PER_1000_TOKENS', 0.03268, 'USD', 'COMPLETION'),
    ('clnon8riv000308mlgfr1agiv', 'text-embedding-ada-002', 'PER_1000_TOKENS', 0.0001, 'USD', 'PROMPT'),
    ('clnon9kfz000408ml1bg81o6z', 'text-embedding-ada-002', 'PER_1000_TOKENS', 0.0001, 'USD', 'COMPLETION'),
    ('clqwniv8a000d08l2frjl7mmw', 'codechat-bison-32k', 'PER_1000_CHARS', 0.0005, 'USD', 'PROMPT'),
    ('clqwnj044000e08l2dfjm5g90', 'chat-bison-32k', 'PER_1000_CHARS', 0.0005, 'USD', 'PROMPT'),
    ('clqwnj47r000f08l2a16fekls', 'chat-bison-32k', 'PER_1000_CHARS', 0.0005, 'USD', 'COMPLETION'),
    ('clqwnj863000g08l2bwxgdapm', 'codechat-bison-32k', 'PER_1000_CHARS', 0.0005, 'USD', 'COMPLETION')
    ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- 来源文件夹: 20240104210051_add_model_indices
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240104210051_add_model_indices\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_model_idx" ON "observations"("model");


-- ==================================================
-- 来源文件夹: 20240104210052_add_model_indices_pricing
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240104210052_add_model_indices_pricing\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "pricings_model_name_idx" ON "pricings"("model_name");

-- ==================================================
-- 来源文件夹: 20240105010215_add_tags_in_traces
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240105010215_add_tags_in_traces\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "traces" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ==================================================
-- 来源文件夹: 20240105170551_index_tags_in_traces
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240105170551_index_tags_in_traces\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "traces_tags_idx" ON "traces" USING GIN ("tags" array_ops);

-- ==================================================
-- 来源文件夹: 20240106195340_drop_dataset_status
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240106195340_drop_dataset_status\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the column `status` on the `datasets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "datasets" DROP COLUMN "status";

-- ==================================================
-- 来源文件夹: 20240111152124_add_gpt_35_pricing
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240111152124_add_gpt_35_pricing\migration.sql
-- ==================================================

-- Migration to add gpt-35 spelling

INSERT INTO pricings (
    id,
    model_name,
    pricing_unit,
    price,
    currency,
    token_type
)
VALUES
    ('clqqpc2pr000008l3hvy63gxy1','gpt-35-turbo-1106', 'PER_1000_TOKENS', 0.001, 'USD', 'PROMPT'),
    ('clqqpcb6d000208l3atrfbmou1','gpt-35-turbo-1106', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION'),
    ('clqqpdh45000008lfgrnx76cv1','gpt-35-turbo-instruct', 'PER_1000_TOKENS', 0.0015, 'USD', 'PROMPT'),
    ('clqqpdjya000108lf3s4b4c4m1','gpt-35-turbo-instruct', 'PER_1000_TOKENS', 0.002, 'USD', 'COMPLETION')
    ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- 来源文件夹: 20240117151938_traces_remove_unique_id_external
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240117151938_traces_remove_unique_id_external\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX "traces_project_id_external_id_key";

-- ==================================================
-- 来源文件夹: 20240117165747_add_cost_to_observations
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240117165747_add_cost_to_observations\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "input_cost" DECIMAL(65,30),
ADD COLUMN     "output_cost" DECIMAL(65,30),
ADD COLUMN     "total_cost" DECIMAL(65,30);

-- ==================================================
-- 来源文件夹: 20240118204639_add_models_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240118204639_add_models_table\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "models" (
                          "id" TEXT NOT NULL,
                          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "project_id" TEXT,
                          "model_name" TEXT NOT NULL,
                          "match_pattern" TEXT NOT NULL,
                          "start_date" TIMESTAMP(3),
                          "input_price" DECIMAL(65,30),
                          "output_price" DECIMAL(65,30),
                          "total_price" DECIMAL(65,30),
                          "unit" TEXT NOT NULL DEFAULT 'TOKENS',
                          "tokenizer_config" JSONB NOT NULL,

                          CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240118204936_add_internal_model
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240118204936_add_internal_model\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "internal_model" TEXT;

-- ==================================================
-- 来源文件夹: 20240118204937_add_observations_view
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240118204937_add_observations_view\migration.sql
-- ==================================================

CREATE VIEW "observations_view" AS
SELECT
    o.*,
    m.id AS "model_id",
    m.start_date AS "model_start_date",
    m.input_price,
    m.output_price,
    m.total_price,
    m.tokenizer_config AS "tokenizer_config",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.prompt_tokens::decimal * m.input_price
        ELSE
            o.input_cost
END AS "calculated_input_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.completion_tokens::decimal * m.output_price
        ELSE
            o.output_cost
END AS "calculated_output_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            CASE
                WHEN m.total_price IS NOT NULL AND o.total_tokens IS NOT NULL THEN
                    m.total_price * o.total_tokens
                ELSE
                    o.prompt_tokens::decimal * m.input_price +
                    o.completion_tokens::decimal * m.output_price
END
ELSE
            o.total_cost
END AS "calculated_total_cost"
FROM
    observations o
LEFT JOIN models m ON m.id = (
    SELECT
        id
    FROM
        models
    WHERE (project_id = o.project_id OR project_id IS NULL)
    AND model_name = o.internal_model
    AND (start_date < o.start_time OR start_date is NULL)
    AND o.unit::TEXT = unit
    ORDER BY
        project_id ASC, -- in postgres, NULLs are sorted first
        start_date DESC
    LIMIT 1
);

-- ==================================================
-- 来源文件夹: 20240118235424_add_index_to_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240118235424_add_index_to_models\migration.sql
-- ==================================================

/*
  Warnings:

  - A unique constraint covering the columns `[project_id,model_name,start_date,unit]` on the table `models` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "models_project_id_model_name_idx" ON "models"("project_id", "model_name");

-- CreateIndex
CREATE UNIQUE INDEX "models_project_id_model_name_start_date_unit_key" ON "models"("project_id", "model_name", "start_date", "unit");

-- ==================================================
-- 来源文件夹: 20240119140941_add_tokenizer_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240119140941_add_tokenizer_id\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "models" ADD COLUMN     "tokenizer_id" TEXT;

-- ==================================================
-- 来源文件夹: 20240119164147_make_model_params_nullable
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240119164147_make_model_params_nullable\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "models" ALTER COLUMN "tokenizer_config" DROP NOT NULL;

-- ==================================================
-- 来源文件夹: 20240119164148_add_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240119164148_add_models\migration.sql
-- ==================================================

-- This is an empty migration.


INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    --project_id, model_name, match_pattern, start_date, input_price, output_price, total_price, unit, tokenizer_id, tokenizer_config
    --https://openai.com/pricing
    -- GPT-4 Turbo
    ('clrkvq6iq000008ju6c16gynt', NULL, 'gpt-4-turbo', '(?i)^(gpt-4-1106-preview)$', NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-1106-preview" }'),
    ('clrkvx5gp000108juaogs54ea', NULL, 'gpt-4-turbo-vision', '(?i)^(gpt-4-vision-preview)$', NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-vision-preview" }'),

    -- GPT-4
    ('clrntkjgy000f08jx79v9g1xj', NULL, 'gpt-4', '(?i)^(gpt-4)$', NULL, 0.00003, 0.00006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }'),
    ('clrkwk4cc000908l537kl0rx3', NULL, 'gpt-4-0613', '(?i)^(gpt-4-0613)$', NULL, 0.00003, 0.00006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-0613" }'),
    ('clrntkjgy000e08jx4x6uawoo', NULL, 'gpt-4-0314', '(?i)^(gpt-4-0314)$', NULL, 0.00003, 0.00006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-0314" }'),

    ('clrkvyzgw000308jue4hse4j9', NULL, 'gpt-4-32k', '(?i)^(gpt-4-32k)$', NULL, 0.00006, 0.00012, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-32k" }'),
    ('clrkwk4cb000108l5hwwh3zdi', NULL, 'gpt-4-32k-0613', '(?i)^(gpt-4-32k-0613)$', NULL, 0.00006, 0.00012, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-32k-0613" }'),
    ('clrntkjgy000d08jx0p4y9h4l', NULL, 'gpt-4-32k-0314', '(?i)^(gpt-4-32k-0314)$', NULL, 0.00006, 0.00012, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-32k-0314" }'),

    -- GPT 3

    ('clrkwk4cc000a08l562uc3s9g', NULL, 'gpt-3.5-turbo-instruct', '(?i)^(gpt-)(35|3.5)(-turbo-instruct)$', NULL, 0.0000015, 0.000002, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo" }'),
    ('clrkwk4cb000408l576jl7koo', NULL, 'gpt-3.5-turbo', '(?i)^(gpt-)(35|3.5)(-turbo)$', '2023-11-06', 0.000001, 0.000002, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo" }'),
    ('clrkwk4cb000208l59yvb9yq8', NULL, 'gpt-3.5-turbo-1106', '(?i)^(gpt-)(35|3.5)(-turbo-1106)$', NULL, 0.000001, 0.000002, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-1106" }'),

    ('clrntkjgy000c08jxesb30p3f', NULL, 'gpt-3.5-turbo', '(?i)^(gpt-)(35|3.5)(-turbo)$', '2023-06-27', 0.0000015, 0.000002, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo" }'),
    ('clrkwk4cc000808l51xmk4uic', NULL, 'gpt-3.5-turbo-0613', '(?i)^(gpt-)(35|3.5)(-turbo-0613)$', NULL, 0.0000015, 0.000002, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-0613" }'),

    ('clrntkjgy000b08jx769q1bah', NULL, 'gpt-3.5-turbo', '(?i)^(gpt-)(35|3.5)(-turbo)$', NULL,  0.000002,  0.000002, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 4, "tokensPerName": -1, "tokenizerModel": "gpt-3.5-turbo" }'),
    ('clrntkjgy000a08jx4e062mr0', NULL, 'gpt-3.5-turbo-0301', '(?i)^(gpt-)(35|3.5)(-turbo-0301)$', NULL,  0.000002,  0.000002, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 4, "tokensPerName": -1, "tokenizerModel": "gpt-3.5-turbo-0301" }'),


    ('clrkwk4cb000308l5go4b6otm', NULL, 'gpt-3.5-turbo-16k', '(?i)^(gpt-)(35|3.5)(-turbo-16k)$', NULL, 0.00003, 0.00004, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-16k" }'),
    ('clrntjt89000a08jw0gcdbd5a', NULL, 'gpt-3.5-turbo-16k-0613', '(?i)^(gpt-)(35|3.5)(-turbo-16k-0613)$', NULL, 0.00003, 0.00004, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-16k-0613" }'),




    -- nothing earlier required for ada
    ('clrntjt89000908jwhvkz5crm', NULL, 'text-embedding-ada-002', '(?i)^(text-embedding-ada-002)$', '2022-12-06', NULL, NULL, 0.0000001, 'TOKENS', 'openai', NULL),
    ('clrntjt89000908jwhvkz5crg', NULL, 'text-embedding-ada-002-v2', '(?i)^(text-embedding-ada-002-v2)$', '2022-12-06', NULL, NULL, 0.0000001, 'TOKENS', 'openai', NULL),




    -- legacy price 2023-08-22 https://platform.openai.com/docs/deprecations/2023-07-06-gpt-and-embeddings
    ('clrntjt89000108jwcou1af71', NULL, 'text-ada-001', '(?i)^(text-ada-001)$', NULL, NULL, NULL, 0.000004, 'TOKENS', 'openai', NULL),
    ('clrntjt89000208jwawjr894q', NULL, 'text-babbage-001', '(?i)^(text-babbage-001)$', NULL, NULL, NULL, 0.0000005, 'TOKENS', 'openai', NULL),
    ('clrp1wopz000708l079w02hkc', NULL, 'text-babbage-002', '(?i)^(text-babbage-002)$', NULL, NULL, NULL, 0.0000005, 'TOKENS', 'openai', NULL),
    ('clrntjt89000308jw0jtfa4rs', NULL, 'text-curie-001', '(?i)^(text-curie-001)$', NULL, NULL, NULL, 0.00002, 'TOKENS', 'openai', NULL),
    ('clrntjt89000408jwc2c93h6i', NULL, 'text-davinci-001', '(?i)^(text-davinci-001)$', NULL, NULL, NULL, 0.00002, 'TOKENS', 'openai', NULL),
    ('clrntjt89000508jw192m64qi', NULL, 'text-davinci-002', '(?i)^(text-davinci-002)$', NULL, NULL, NULL, 0.00002, 'TOKENS', 'openai', NULL),
    ('clrntjt89000608jw4m3x5s55', NULL, 'text-davinci-003', '(?i)^(text-davinci-003)$', NULL, NULL, NULL, 0.00002, 'TOKENS', 'openai', NULL),


    -- claude
    ('clrnwbota000908jsgg9mb1ml', NULL, 'claude-instant-1', '(?i)^(claude-instant-1)$', NULL, 0.00000163, 0.00000551, NULL, 'CHARACTERS', 'claude', NULL),
    ('clrnwb41q000308jsfrac9uh6', NULL, 'claude-instant-1.2', '(?i)^(claude-instant-1.2)$', NULL, 0.00000163, 0.00000551, NULL, 'CHARACTERS', 'claude', NULL),
    ('clrnwbd1m000508js4hxu6o7n', NULL, 'claude-2.1', '(?i)^(claude-2.1)$', NULL, 0.000008, 0.000024, NULL, 'CHARACTERS', 'claude', NULL),
    ('clrnwb836000408jsallr6u11', NULL, 'claude-2.0', '(?i)^(claude-2.0)$', NULL, 0.000008, 0.000024, NULL, 'CHARACTERS', 'claude', NULL),
    ('clrnwbg2b000608jse2pp4q2d', NULL, 'claude-1.3', '(?i)^(claude-1.3)$', NULL, 0.000008, 0.000024, NULL, 'CHARACTERS', 'claude', NULL),
    ('clrnwbi9d000708jseiy44k26', NULL, 'claude-1.2', '(?i)^(claude-1.2)$', NULL, 0.000008, 0.000024, NULL, 'CHARACTERS', 'claude', NULL),
    ('clrnwblo0000808jsc1385hdp', NULL, 'claude-1.1', '(?i)^(claude-1.1)$', NULL, 0.000008, 0.000024, NULL, 'CHARACTERS', 'claude', NULL),


    -- vertex
    ('clrp1wopz000808l09nwy32xh', NULL, 'codechat-bison-32k', '(?i)^(codechat-bison-32k)$', NULL, 0.0000005, 0.0000025, NULL, 'TOKENS', 'vertex', NULL),
    ('clrp1wopz000408l05xcycki1', NULL, 'chat-bison-32k', '(?i)^(chat-bison-32k)$', NULL, 0.0000005, 0.0000025, NULL, 'TOKENS', 'vertex', NULL);




-- ==================================================
-- 来源文件夹: 20240124140443_session_composite_key
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240124140443_session_composite_key\migration.sql
-- ==================================================

/*
  Warnings:

  - The primary key for the `trace_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "traces" DROP CONSTRAINT "traces_session_id_fkey";

-- DropIndex
DROP INDEX "trace_sessions_id_project_id_key";

-- AlterTable
ALTER TABLE "trace_sessions" DROP CONSTRAINT "trace_sessions_pkey",
ADD CONSTRAINT "trace_sessions_pkey" PRIMARY KEY ("id", "project_id");

-- AddForeignKey
ALTER TABLE "traces" ADD CONSTRAINT "traces_session_id_project_id_fkey" FOREIGN KEY ("session_id", "project_id") REFERENCES "trace_sessions"("id", "project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240124164148_correct_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240124164148_correct_models\migration.sql
-- ==================================================

-- This is an empty migration.

DELETE FROM models
WHERE id in ('clrntjt89000908jwhvkz5crm', 'clrntjt89000908jwhvkz5crg', 'clrntjt89000108jwcou1af71', 'clrntjt89000208jwawjr894q', 'clrntjt89000308jw0jtfa4rs', 'clrntjt89000408jwc2c93h6i', 'clrntjt89000508jw192m64qi', 'clrntjt89000608jw4m3x5s55', 'clrp1wopz000708l079w02hkc');



INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- nothing earlier required for ada
    ('clrntjt89000908jwhvkz5crm', NULL, 'text-embedding-ada-002', '(?i)^(text-embedding-ada-002)$', '2022-12-06', NULL, NULL, 0.0000001, 'TOKENS', 'openai', '{"tokenizerModel": "text-embedding-ada-002"}'),
    ('clrntjt89000908jwhvkz5crg', NULL, 'text-embedding-ada-002-v2', '(?i)^(text-embedding-ada-002-v2)$', '2022-12-06', NULL, NULL, 0.0000001, 'TOKENS', 'openai', '{"tokenizerModel": "text-embedding-ada-002"}'),




    -- -- legacy price 2023-08-22 https://platform.openai.com/docs/deprecations/2023-07-06-gpt-and-embeddings
    ('clrntjt89000108jwcou1af71', NULL, 'text-ada-001', '(?i)^(text-ada-001)$', NULL, NULL, NULL, 0.000004, 'TOKENS', 'openai', '{"tokenizerModel": "text-ada-001"}'),
    ('clrntjt89000208jwawjr894q', NULL, 'text-babbage-001', '(?i)^(text-babbage-001)$', NULL, NULL, NULL, 0.0000005, 'TOKENS', 'openai', '{"tokenizerModel": "text-babbage-001"}'),
    ('clrntjt89000308jw0jtfa4rs', NULL, 'text-curie-001', '(?i)^(text-curie-001)$', NULL, NULL, NULL, 0.00002, 'TOKENS', 'openai', '{"tokenizerModel": "text-curie-001"}'),
    ('clrntjt89000408jwc2c93h6i', NULL, 'text-davinci-001', '(?i)^(text-davinci-001)$', NULL, NULL, NULL, 0.00002, 'TOKENS', 'openai', '{"tokenizerModel": "text-davinci-001"}'),
    ('clrntjt89000508jw192m64qi', NULL, 'text-davinci-002', '(?i)^(text-davinci-002)$', NULL, NULL, NULL, 0.00002, 'TOKENS', 'openai', '{"tokenizerModel": "text-davinci-002"}'),
    ('clrntjt89000608jw4m3x5s55', NULL, 'text-davinci-003', '(?i)^(text-davinci-003)$', NULL, NULL, NULL, 0.00002, 'TOKENS', 'openai', '{"tokenizerModel": "text-davinci-003"}'),

    ('clrs2dnql000108l46vo0gp2t', NULL, 'babbage-002', '(?i)^(babbage-002)$', NULL, 0.0000004, 0.0000016, 0.0000005, 'TOKENS', 'openai', '{"tokenizerModel": "babbage-002"}'),
    ('clrs2ds35000208l4g4b0hi3u', NULL, 'davinci-002', '(?i)^(davinci-002)$', NULL, 0.0000060, 0.0000120, 0.0000005, 'TOKENS', 'openai', '{"tokenizerModel": "davinci-002"}');





-- ==================================================
-- 来源文件夹: 20240126184148_new_models copy
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240126184148_new_models copy\migration.sql
-- ==================================================

-- This is an empty migration.

DELETE FROM models
WHERE id in ('clrp1wopz000808l09nwy32xh', 'clrp1wopz000408l05xcycki1','clrs2dnql000108l46vo0gp2t', 'clrs2ds35000208l4g4b0hi3u');



INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- https://openai.com/blog/new-embedding-models-and-api-updates
    -- tokenizers are best guess for embedding models
    ('clruwn3pc00010al7bl611c8o', NULL, 'text-embedding-3-small', '(?i)^(text-embedding-3-small)$', NULL, NULL, NULL, 0.00000002, 'TOKENS', 'openai', '{"tokenizerModel": "text-embedding-ada-002"}'),
    ('clruwn76700020al7gp8e4g4l', NULL, 'text-embedding-ada-002-v2', '(?i)^(text-embedding-3-large)$', NULL, NULL, NULL, 0.00000013, 'TOKENS', 'openai', '{"tokenizerModel": "text-embedding-ada-002"}'),

    ('clruwnahl00030al7ab9rark7', NULL, 'gpt-3.5-turbo-0125', '(?i)^(gpt-)(35|3.5)(-turbo-0125)$', NULL, 0.0000005, 0.0000015, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo" }'),
    ('clruwnahl00040al78f1lb0at', NULL, 'gpt-3.5-turbo', '(?i)^(gpt-)(35|3.5)(-turbo)$', '2024-02-08', 0.0000005, 0.0000015, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo" }'),

    ('clruwnahl00050al796ck3p44', NULL, 'gpt-4-0125-preview', '(?i)^(gpt-4-0125-preview)$', NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }'),
    ('clruwnahl00060al74fcfehas', NULL, 'gpt-4-turbo-preview', '(?i)^(gpt-4-turbo-preview)$', NULL, 0.00003, 0.00006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }'),

    -- fix tokenizer for vertx
    ('clrp1wopz000808l09nwy32xh', NULL, 'codechat-bison-32k', '(?i)^(codechat-bison-32k)$', NULL, 0.0000005, 0.0000025, NULL, 'TOKENS', NULL, NULL),
    ('clrp1wopz000408l05xcycki1', NULL, 'chat-bison-32k', '(?i)^(chat-bison-32k)$', NULL, 0.0000005, 0.0000025, NULL, 'TOKENS', NULL, NULL),

    -- fix prices
    ('clrs2dnql000108l46vo0gp2t', NULL, 'babbage-002', '(?i)^(babbage-002)$', NULL, 0.0000004, 0.0000016, NULL, 'TOKENS', 'openai', '{"tokenizerModel": "babbage-002"}'),
    ('clrs2ds35000208l4g4b0hi3u', NULL, 'davinci-002', '(?i)^(davinci-002)$', NULL, 0.0000060, 0.0000120, NULL, 'TOKENS', 'openai', '{"tokenizerModel": "davinci-002"}');

-- ==================================================
-- 来源文件夹: 20240130100110_usage_unit_nullable
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240130100110_usage_unit_nullable\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "models" ALTER COLUMN "unit" DROP DEFAULT;

-- AlterTable
ALTER TABLE "observations" ALTER COLUMN "unit" DROP NOT NULL,
ALTER COLUMN "unit" DROP DEFAULT;

-- ==================================================
-- 来源文件夹: 20240130160110_claude_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240130160110_claude_models\migration.sql
-- ==================================================

-- This is an empty migration.

DELETE FROM models
WHERE id in (
             'clrnwbota000908jsgg9mb1ml',
             'clrnwb41q000308jsfrac9uh6',
             'clrnwbd1m000508js4hxu6o7n',
             'clrnwb836000408jsallr6u11',
             'clrnwbg2b000608jse2pp4q2d',
             'clrnwbi9d000708jseiy44k26',
             'clrnwblo0000808jsc1385hdp'
    );



INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- nothing earlier required for ada
    ('clrnwbota000908jsgg9mb1ml', NULL, 'claude-instant-1', '(?i)^(claude-instant-1)$', NULL, 0.00000163, 0.00000551, NULL, 'TOKENS', 'claude', NULL),
    ('clrnwb41q000308jsfrac9uh6', NULL, 'claude-instant-1.2', '(?i)^(claude-instant-1.2)$', NULL, 0.00000163, 0.00000551, NULL, 'TOKENS', 'claude', NULL),
    ('clrnwbd1m000508js4hxu6o7n', NULL, 'claude-2.1', '(?i)^(claude-2.1)$', NULL, 0.000008, 0.000024, NULL, 'TOKENS', 'claude', NULL),
    ('clrnwb836000408jsallr6u11', NULL, 'claude-2.0', '(?i)^(claude-2.0)$', NULL, 0.000008, 0.000024, NULL, 'TOKENS', 'claude', NULL),
    ('clrnwbg2b000608jse2pp4q2d', NULL, 'claude-1.3', '(?i)^(claude-1.3)$', NULL, 0.000008, 0.000024, NULL, 'TOKENS', 'claude', NULL),
    ('clrnwbi9d000708jseiy44k26', NULL, 'claude-1.2', '(?i)^(claude-1.2)$', NULL, 0.000008, 0.000024, NULL, 'TOKENS', 'claude', NULL),
    ('clrnwblo0000808jsc1385hdp', NULL, 'claude-1.1', '(?i)^(claude-1.1)$', NULL, 0.000008, 0.000024, NULL, 'TOKENS', 'claude', NULL);




-- ==================================================
-- 来源文件夹: 20240131184148_add_finetuned_and_vertex_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240131184148_add_finetuned_and_vertex_models\migration.sql
-- ==================================================

DELETE FROM models
WHERE id in ('clrp1wopz000808l09nwy32xh', 'clrp1wopz000408l05xcycki1');

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- https://openai.com/blog/new-embedding-models-and-api-updates
    -- https://openai.com/blog/gpt-3-5-turbo-fine-tuning-and-api-updates
    -- ft model tokens are getting counted like the base model https://github.com/openai/tiktoken/blob/db5bda9fc93b3171db6c4afea329394e6b6d31ca/tiktoken/model.py

    ('cls08r8sq000308jq14ae96f0', NULL, 'ft:gpt-3.5-turbo-1106', '(?i)^(ft:)(gpt-3.5-turbo-1106:)(.+)(:)(.*)(:)(.+)$', NULL, 0.000003, 0.000006, NULL, 'TOKENS', 'openai', '{"tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-1106", "tokensPerMessage": 3}'),
    ('cls08rp99000408jqepxoakjv', NULL, 'ft:gpt-3.5-turbo-0613', '(?i)^(ft:)(gpt-3.5-turbo-0613:)(.+)(:)(.*)(:)(.+)$', NULL, 0.000012, 0.000016, NULL, 'TOKENS', 'openai', '{"tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-0613", "tokensPerMessage": 3}'),
    ('cls08rv9g000508jq5p4z4nlr', NULL, 'ft:davinci-002', '(?i)^(ft:)(davinci-002:)(.+)(:)(.*)(:)(.+)$$', NULL, 0.000012, 0.000012, NULL, 'TOKENS', 'openai', '{"tokenizerModel": "davinci-002"}'),
    ('cls08s2bw000608jq57wj4un2', NULL, 'ft:babbage-002', '(?i)^(ft:)(babbage-002:)(.+)(:)(.*)(:)(.+)$$', NULL, 0.0000016, 0.0000016, NULL, 'TOKENS', 'openai', '{"tokenizerModel": "babbage-002"}'),

    -- https://cloud.google.com/vertex-ai/docs/generative-ai/pricing
    ('cls0k4lqt000008ky1o1s8wd5', NULL, 'gemini-pro', '(?i)^(gemini-pro)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls0jni4t000008jk3kyy803r', NULL, 'chat-bison-32k', '(?i)^(chat-bison-32k)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls0iv12d000108l251gf3038', NULL, 'chat-bison', '(?i)^(chat-bison)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls0jmjt3000108l83ix86w0d', NULL, 'text-bison-32k', '(?i)^(text-bison-32k)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls0juygp000308jk2a6x9my2', NULL, 'text-bison', '(?i)^(text-bison)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls0jungb000208jk12gm4gk1', NULL, 'text-unicorn', '(?i)^(text-unicorn)(@[a-zA-Z0-9]+)?$', NULL, 0.0000025, 0.0000075, NULL, 'CHARACTERS', NULL, NULL),
    ('cls1nyj5q000208l33ne901d8', NULL, 'textembedding-gecko', '(?i)^(textembedding-gecko)(@[a-zA-Z0-9]+)?$', NULL, NULL, NULL, 0.0000001, 'CHARACTERS', NULL, NULL),
    ('cls1nyyjp000308l31gxy1bih', NULL, 'textembedding-gecko-multilingual', '(?i)^(textembedding-gecko-multilingual)(@[a-zA-Z0-9]+)?$', NULL, NULL, NULL, 0.0000001, 'CHARACTERS', NULL, NULL),
    ('cls1nzjt3000508l3dnwad3g0', NULL, 'code-gecko', '(?i)^(code-gecko)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls1nzwx4000608l38va7e4tv', NULL, 'code-bison', '(?i)^(code-bison)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls1o053j000708l39f8g4bgs', NULL, 'code-bison-32k', '(?i)^(code-bison-32k)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls0j33v1000008joagkc4lql', NULL, 'codechat-bison-32k', '(?i)^(codechat-bison-32k)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    ('cls0jmc9v000008l8ee6r3gsd', NULL, 'codechat-bison', '(?i)^(codechat-bison)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL);

-- ==================================================
-- 来源文件夹: 20240203184148_update_pricing
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240203184148_update_pricing\migration.sql
-- ==================================================

-- This is an empty migration.

DELETE FROM models
WHERE id in ('clrkwk4cb000308l5go4b6otm', 'clrntjt89000a08jw0gcdbd5a');



INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- https://openai.com/blog/new-embedding-models-and-api-updates


    -- fix prices
    ('clrkwk4cb000308l5go4b6otm', NULL, 'gpt-3.5-turbo-16k', '(?i)^(gpt-)(35|3.5)(-turbo-16k)$', NULL, 0.000003, 0.000004, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-16k" }'),
    ('clrntjt89000a08jw0gcdbd5a', NULL, 'gpt-3.5-turbo-16k-0613', '(?i)^(gpt-)(35|3.5)(-turbo-16k-0613)$', NULL, 0.000003, 0.000004, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-16k-0613" }');

-- ==================================================
-- 来源文件夹: 20240212175433_add_audit_log_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240212175433_add_audit_log_table\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "audit_logs" (
                              "id" TEXT NOT NULL,
                              "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              "user_id" TEXT NOT NULL,
                              "project_id" TEXT NOT NULL,
                              "user_project_role" "MembershipRole" NOT NULL,
                              "resource_type" TEXT NOT NULL,
                              "resource_id" TEXT NOT NULL,
                              "action" TEXT NOT NULL,
                              "before" TEXT,
                              "after" TEXT,

                              CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_project_id_idx" ON "audit_logs"("project_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240213124148_update_openai_pricing
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240213124148_update_openai_pricing\migration.sql
-- ==================================================

-- This is an empty migration.

DELETE FROM models
WHERE id in ('clruwnahl00040al78f1lb0at');



INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- according to email, gpt-3.5-turbo and gpt-3.5-turbo-16k will point to 0125 models as of 2024-02-16
    -- gpt-3.5-turbo-0125 now supports 16k token length. 16k model will point to regular 3.5 turbo model according to mail.
    ('clruwnahl00040al78f1lb0at', NULL, 'gpt-3.5-turbo', '(?i)^(gpt-)(35|3.5)(-turbo)$', '2024-02-16', 0.0000005, 0.0000015, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo" }'),
    ('clsk9lntu000008jwfc51bbqv', NULL, 'gpt-3.5-turbo-16k', '(?i)^(gpt-)(35|3.5)(-turbo-16k)$', '2024-02-16', 0.0000005, 0.0000015, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo-16k" }');

-- ==================================================
-- 来源文件夹: 20240214232619_prompts_add_indicies
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240214232619_prompts_add_indicies\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "prompts_project_id_id_idx" ON "prompts"("project_id", "id");

-- CreateIndex
CREATE INDEX "prompts_project_id_idx" ON "prompts"("project_id");

-- ==================================================
-- 来源文件夹: 20240215224148_update_openai_pricing
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240215224148_update_openai_pricing\migration.sql
-- ==================================================

-- This is an empty migration.

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    ('clsnq07bn000008l4e46v1ll8', NULL, 'gpt-4-turbo-preview', '(?i)^(gpt-4-turbo-preview)$', '2023-11-06', 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }');

-- ==================================================
-- 来源文件夹: 20240215234937_fix_observations_view
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240215234937_fix_observations_view\migration.sql
-- ==================================================

CREATE OR REPLACE VIEW "observations_view" AS
SELECT
    o.*,
    m.id AS "model_id",
    m.start_date AS "model_start_date",
    m.input_price,
    m.output_price,
    m.total_price,
    m.tokenizer_config AS "tokenizer_config",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.prompt_tokens::decimal * m.input_price
        ELSE
            o.input_cost
END AS "calculated_input_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.completion_tokens::decimal * m.output_price
        ELSE
            o.output_cost
END AS "calculated_output_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            CASE
                WHEN m.total_price IS NOT NULL AND o.total_tokens IS NOT NULL THEN
                    m.total_price * o.total_tokens
                ELSE
                    o.prompt_tokens::decimal * m.input_price +
                    o.completion_tokens::decimal * m.output_price
END
ELSE
            o.total_cost
END AS "calculated_total_cost",
    CASE WHEN o.end_time IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM o."end_time") - EXTRACT(EPOCH FROM o."start_time"))::double precision END AS "latency"
FROM
    observations o
LEFT JOIN models m ON m.id = (
    SELECT
        id
    FROM
        models
    WHERE (project_id = o.project_id OR project_id IS NULL)
    AND model_name = o.internal_model
    AND (start_date < o.start_time OR start_date is NULL)
    AND o.unit::TEXT = unit
    ORDER BY
        project_id ASC, -- in postgres, NULLs are sorted last when ordering ASC
        start_date DESC NULLS LAST -- now, NULLs are sorted last when ordering DESC as well
    LIMIT 1
);

-- ==================================================
-- 来源文件夹: 20240219162415_add_prompt_config
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240219162415_add_prompt_config\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "prompts" ADD COLUMN     "config" JSONB NOT NULL DEFAULT '{}';

-- ==================================================
-- 来源文件夹: 20240226165118_add_observations_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240226165118_add_observations_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_project_id_start_time_type_idx" ON "observations"("project_id", "start_time", "type");

-- ==================================================
-- 来源文件夹: 20240226182815_add_model_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240226182815_add_model_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "models_project_id_model_name_start_date_unit_idx" ON "models"("project_id", "model_name", "start_date", "unit");

-- ==================================================
-- 来源文件夹: 20240226183642_add_observations_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240226183642_add_observations_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_project_id_internal_model_start_time_unit_idx" ON "observations"("project_id", "internal_model", "start_time", "unit");

-- ==================================================
-- 来源文件夹: 20240226202040_add_observations_trace_id_project_id_start_time_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240226202040_add_observations_trace_id_project_id_start_time_idx\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_trace_id_project_id_start_time_idx" ON "observations"("trace_id", "project_id", "start_time");

-- ==================================================
-- 来源文件夹: 20240226202041_add_observations_trace_id_project_id_type_start_time_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240226202041_add_observations_trace_id_project_id_type_start_time_idx\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_trace_id_project_id_type_start_time_idx" ON "observations"("trace_id", "project_id", "type", "start_time");

-- ==================================================
-- 来源文件夹: 20240226203642_rewrite_observations_view
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240226203642_rewrite_observations_view\migration.sql
-- ==================================================

CREATE OR REPLACE VIEW "observations_view" AS
SELECT
    o.*,
    m.id AS "model_id",
    m.start_date AS "model_start_date",
    m.input_price,
    m.output_price,
    m.total_price,
    m.tokenizer_config AS "tokenizer_config",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.prompt_tokens::decimal * m.input_price
        ELSE
            o.input_cost
END AS "calculated_input_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.completion_tokens::decimal * m.output_price
        ELSE
            o.output_cost
END AS "calculated_output_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            CASE
                WHEN m.total_price IS NOT NULL AND o.total_tokens IS NOT NULL THEN
                    m.total_price * o.total_tokens
                ELSE
                    o.prompt_tokens::decimal * m.input_price +
                    o.completion_tokens::decimal * m.output_price
END
ELSE
            o.total_cost
END AS "calculated_total_cost",
    CASE WHEN o.end_time IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM o."end_time") - EXTRACT(EPOCH FROM o."start_time"))::double precision END AS "latency"
FROM
    observations o
LEFT JOIN LATERAL (
    SELECT
        models.*
    FROM
        models
    WHERE (models.project_id = o.project_id OR models.project_id IS NULL)
    AND models.model_name = o.internal_model
    AND (models.start_date < o.start_time OR models.start_date IS NULL)
    AND o.unit::TEXT = models.unit
    ORDER BY
        models.project_id ASC, -- in postgres, NULLs are sorted last when ordering ASC
        models.start_date DESC NULLS LAST -- now, NULLs are sorted last when ordering DESC as well
    LIMIT 1
) m ON TRUE;

-- ==================================================
-- 来源文件夹: 20240227112101_index_prompt_id_in_observations
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240227112101_index_prompt_id_in_observations\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "observations_prompt_id_idx" ON "observations"("prompt_id");

-- ==================================================
-- 来源文件夹: 20240228103642_observations_view_cte
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240228103642_observations_view_cte\migration.sql
-- ==================================================

CREATE OR REPLACE VIEW "observations_view" AS
WITH model_ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY project_id, model_name, unit
            ORDER BY project_id ASC, start_date DESC NULLS LAST
        ) AS rn
        -- adds a new column to the models table ordering the rows by project_id, model_name, and unit
        -- each query should take the first row within a partition
    FROM
        models
)
SELECT
    o.*,
    m.id AS "model_id",
    m.start_date AS "model_start_date",
    m.input_price,
    m.output_price,
    m.total_price,
    m.tokenizer_config AS "tokenizer_config",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.prompt_tokens::decimal * m.input_price
        ELSE
            o.input_cost
END AS "calculated_input_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.completion_tokens::decimal * m.output_price
        ELSE
            o.output_cost
END AS "calculated_output_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            CASE
                WHEN m.total_price IS NOT NULL AND o.total_tokens IS NOT NULL THEN
                    m.total_price * o.total_tokens
                ELSE
                    o.prompt_tokens::decimal * m.input_price +
                    o.completion_tokens::decimal * m.output_price
END
ELSE
            o.total_cost
END AS "calculated_total_cost",
    CASE WHEN o.end_time IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM o."end_time") - EXTRACT(EPOCH FROM o."start_time"))::double precision END AS "latency"
FROM
    observations o
LEFT JOIN model_ranked m ON
    m.rn = 1 AND
    (m.project_id = o.project_id OR m.project_id IS NULL) AND
    m.model_name = o.internal_model AND
    (m.start_date < o.start_time OR m.start_date IS NULL) AND
    o.unit::TEXT = m.unit;

-- ==================================================
-- 来源文件夹: 20240228123642_observations_view_fix
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240228123642_observations_view_fix\migration.sql
-- ==================================================

CREATE OR REPLACE VIEW "observations_view" AS
SELECT
    o.*,
    m.id AS "model_id",
    m.start_date AS "model_start_date",
    m.input_price,
    m.output_price,
    m.total_price,
    m.tokenizer_config AS "tokenizer_config",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.prompt_tokens::decimal * m.input_price
        ELSE
            o.input_cost
END AS "calculated_input_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.completion_tokens::decimal * m.output_price
        ELSE
            o.output_cost
END AS "calculated_output_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            CASE
                WHEN m.total_price IS NOT NULL AND o.total_tokens IS NOT NULL THEN
                    m.total_price * o.total_tokens
                ELSE
                    o.prompt_tokens::decimal * m.input_price +
                    o.completion_tokens::decimal * m.output_price
END
ELSE
            o.total_cost
END AS "calculated_total_cost",
    CASE WHEN o.end_time IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM o."end_time") - EXTRACT(EPOCH FROM o."start_time"))::double precision END AS "latency"
FROM
    observations o
LEFT JOIN LATERAL (
    SELECT
        models.*
    FROM
        models
    WHERE (models.project_id = o.project_id OR models.project_id IS NULL)
    AND models.model_name = o.internal_model
    AND (models.start_date < o.start_time OR models.start_date IS NULL)
    AND o.unit::TEXT = models.unit
    ORDER BY
        models.project_id ASC, -- in postgres, NULLs are sorted last when ordering ASC
        models.start_date DESC NULLS LAST -- now, NULLs are sorted last when ordering DESC as well
    LIMIT 1
) m ON TRUE;


-- requirements:
-- 1. The view should return all columns from the observations table
-- 2. The view should match with only one model for each observation if:
--     a. The model has the same project_id as the observation, otherwise the model without project_id.
--     b. The model has the same model_name as the observation
--     c. The model has a start_date that is less than the observation start_time, otherwise the model without start_date
--     d. The model has the same unit as the observation

-- ==================================================
-- 来源文件夹: 20240304123642_traces_view
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240304123642_traces_view\migration.sql
-- ==================================================

CREATE VIEW trace_metrics_view AS
SELECT
    t.id,
    EXTRACT(EPOCH FROM COALESCE(MAX(o.end_time), MAX(o.start_time))) - EXTRACT(EPOCH FROM MIN(o.start_time))::double precision AS duration
FROM
    traces t
    LEFT JOIN observations o ON t.id = o.trace_id group by t.project_id, t.id;

-- ==================================================
-- 来源文件夹: 20240304123642_traces_view_improvement
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240304123642_traces_view_improvement\migration.sql
-- ==================================================

DROP VIEW trace_metrics_view;


CREATE OR REPLACE VIEW traces_view AS
WITH observations_metrics AS (
    SELECT
        trace_id,
        project_id,
        EXTRACT(EPOCH FROM COALESCE(MAX(o.end_time), MAX(o.start_time))) - EXTRACT(EPOCH FROM MIN(o.start_time))::double precision AS duration
    FROM
        observations o
    GROUP BY
        project_id, trace_id
)
SELECT
    t.*,
    o.duration
FROM
    traces t
        LEFT JOIN observations_metrics o ON t.id = o.trace_id and t.project_id = o.project_id;

-- ==================================================
-- 来源文件夹: 20240304222519_scores_add_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240304222519_scores_add_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "scores_timestamp_idx" ON "scores"("timestamp");

-- ==================================================
-- 来源文件夹: 20240305095119_add_observations_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240305095119_add_observations_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_trace_id_project_id_idx" ON "observations"("trace_id", "project_id");

-- ==================================================
-- 来源文件夹: 20240305100713_traces_add_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240305100713_traces_add_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "traces_id_user_id_idx" ON "traces"("id", "user_id");

-- ==================================================
-- 来源文件夹: 20240307090110_claude_model_three
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240307090110_claude_model_three\migration.sql
-- ==================================================

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- https://docs.anthropic.com/claude/docs/models-overview, https://docs.anthropic.com/claude/docs/quickstart-guide
    ('cltgy0iuw000008le3vod1hhy', NULL, 'claude-3-opus-20240229', '(?i)^(claude-3-opus-20240229)$', NULL, 0.000015, 0.000075, NULL, 'TOKENS', 'claude', NULL),
    ('cltgy0pp6000108le56se7bl3', NULL, 'claude-3-sonnet-20240229', '(?i)^(claude-3-sonnet-20240229)$', NULL, 0.000003, 0.000015, NULL, 'TOKENS', 'claude', NULL);


-- ==================================================
-- 来源文件夹: 20240307185543_score_add_source_nullable
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240307185543_score_add_source_nullable\migration.sql
-- ==================================================

-- CreateEnum
CREATE TYPE "ScoreSource" AS ENUM ('API', 'REVIEW');

-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "source" "ScoreSource" NOT NULL DEFAULT 'API';

-- ==================================================
-- 来源文件夹: 20240307185544_score_add_name_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240307185544_score_add_name_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "scores_source_idx" ON "scores"("source");

-- ==================================================
-- 来源文件夹: 20240307185725_backfill_score_source
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240307185725_backfill_score_source\migration.sql
-- ==================================================

-- scores previously created in the Langfuse UI all had the name 'manual-score'
UPDATE "scores"
SET "source" = 'REVIEW'::"ScoreSource"
WHERE "name" = 'manual-score';

-- ==================================================
-- 来源文件夹: 20240312195727_score_source_drop_default
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240312195727_score_source_drop_default\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "scores" ALTER COLUMN "source" DROP DEFAULT;

-- ==================================================
-- 来源文件夹: 20240314090110_claude_model
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240314090110_claude_model\migration.sql
-- ==================================================

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- https://docs.anthropic.com/claude/docs/models-overview, https://docs.anthropic.com/claude/docs/quickstart-guide
    ('cltr0w45b000008k1407o9qv1', NULL, 'claude-3-haiku-20240307', '(?i)^(claude-3-haiku-20240307)$', NULL, 0.00000025, 0.00000125, NULL, 'TOKENS', 'claude', NULL);


-- ==================================================
-- 来源文件夹: 20240325211959_remove_example_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240325211959_remove_example_table\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the `Example` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Example";

-- ==================================================
-- 来源文件夹: 20240325212245_dataset_runs_add_metadata
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240325212245_dataset_runs_add_metadata\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "dataset_runs" ADD COLUMN     "metadata" JSONB;

-- ==================================================
-- 来源文件夹: 20240326114211_dataset_run_item_bind_to_trace
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240326114211_dataset_run_item_bind_to_trace\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "dataset_run_items" ADD COLUMN     "trace_id" TEXT,
ALTER COLUMN "observation_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "traces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240326114337_dataset_run_item_backfill_trace_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240326114337_dataset_run_item_backfill_trace_id\migration.sql
-- ==================================================

-- Backfill trace_id for existing run_items based on the linked observation
UPDATE dataset_run_items
SET trace_id = observations.trace_id
    FROM observations
WHERE dataset_run_items.observation_id = observations.id;

-- ==================================================
-- 来源文件夹: 20240326115136_dataset_run_item_traceid_non_null
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240326115136_dataset_run_item_traceid_non_null\migration.sql
-- ==================================================

/*
  Warnings:

  - Made the column `trace_id` on table `dataset_run_items` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "dataset_run_items" ALTER COLUMN "trace_id" SET NOT NULL;

-- ==================================================
-- 来源文件夹: 20240326115424_dataset_run_item_index_trace
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240326115424_dataset_run_item_index_trace\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "dataset_run_items_trace_id_idx" ON "dataset_run_items"("trace_id");

-- ==================================================
-- 来源文件夹: 20240328065738_dataset_item_input_nullable
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240328065738_dataset_item_input_nullable\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "dataset_items" ALTER COLUMN "input" DROP NOT NULL;

-- ==================================================
-- 来源文件夹: 20240404203640_dataset_item_source_trace_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240404203640_dataset_item_source_trace_id\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "dataset_items" ADD COLUMN     "source_trace_id" TEXT;

-- AddForeignKey
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_source_trace_id_fkey" FOREIGN KEY ("source_trace_id") REFERENCES "traces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240404210315_dataset_add_descriptions
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240404210315_dataset_add_descriptions\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "dataset_runs" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "description" TEXT;

-- ==================================================
-- 来源文件夹: 20240404232317_dataset_items_backfill_source_trace_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240404232317_dataset_items_backfill_source_trace_id\migration.sql
-- ==================================================

-- Backfill source_trace_id for existing dataset_items based on the linked source_observation_id
UPDATE dataset_items
SET source_trace_id = observations.trace_id
    FROM observations
WHERE dataset_items.source_observation_id = observations.id
  AND dataset_items.source_observation_id IS NOT NULL
  AND dataset_items.source_trace_id IS NULL;

-- ==================================================
-- 来源文件夹: 20240405124810_prompt_to_json
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240405124810_prompt_to_json\migration.sql
-- ==================================================

BEGIN;

ALTER TABLE prompts
    ADD COLUMN json_prompt JSONB;

UPDATE prompts
SET json_prompt = to_json(prompt::text)::json;

ALTER TABLE prompts DROP COLUMN prompt;

ALTER TABLE prompts
    RENAME COLUMN json_prompt TO prompt;

ALTER TABLE prompts
    ALTER COLUMN prompt SET NOT NULL;

ALTER TABLE prompts
    ADD COLUMN type TEXT NOT NULL DEFAULT 'text';

COMMIT;

-- ==================================================
-- 来源文件夹: 20240408133037_add_objects_for_evals
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240408133037_add_objects_for_evals\migration.sql
-- ==================================================

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('EVAL');

-- CreateEnum
CREATE TYPE "JobExecutionStatus" AS ENUM ('COMPLETED', 'ERROR', 'PENDING', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ScoreSource" ADD VALUE 'EVAL';

-- CreateTable
CREATE TABLE "eval_templates" (
                                  "id" TEXT NOT NULL,
                                  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "project_id" TEXT NOT NULL,
                                  "name" TEXT NOT NULL,
                                  "version" INTEGER NOT NULL,
                                  "prompt" TEXT NOT NULL,
                                  "model" TEXT NOT NULL,
                                  "model_params" JSONB NOT NULL,
                                  "vars" TEXT[] DEFAULT ARRAY[]::TEXT[],
                                  "output_schema" JSONB NOT NULL,

                                  CONSTRAINT "eval_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_configurations" (
                                      "id" TEXT NOT NULL,
                                      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      "project_id" TEXT NOT NULL,
                                      "job_type" "JobType" NOT NULL,
                                      "eval_template_id" TEXT,
                                      "score_name" TEXT NOT NULL,
                                      "filter" JSONB NOT NULL,
                                      "target_object" TEXT NOT NULL,
                                      "variable_mapping" JSONB NOT NULL,
                                      "sampling" DECIMAL(65,30) NOT NULL,
                                      "delay" INTEGER NOT NULL,

                                      CONSTRAINT "job_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_executions" (
                                  "id" TEXT NOT NULL,
                                  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "project_id" TEXT NOT NULL,
                                  "job_configuration_id" TEXT NOT NULL,
                                  "status" "JobExecutionStatus" NOT NULL,
                                  "start_time" TIMESTAMP(3),
                                  "end_time" TIMESTAMP(3),
                                  "error" TEXT,
                                  "job_input_trace_id" TEXT,
                                  "job_output_score_id" TEXT,

                                  CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eval_templates_project_id_id_idx" ON "eval_templates"("project_id", "id");

-- CreateIndex
CREATE INDEX "eval_templates_project_id_idx" ON "eval_templates"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "eval_templates_project_id_name_version_key" ON "eval_templates"("project_id", "name", "version");

-- CreateIndex
CREATE INDEX "job_configurations_project_id_id_idx" ON "job_configurations"("project_id", "id");

-- CreateIndex
CREATE INDEX "job_configurations_project_id_idx" ON "job_configurations"("project_id");

-- CreateIndex
CREATE INDEX "job_executions_project_id_id_idx" ON "job_executions"("project_id", "id");

-- CreateIndex
CREATE INDEX "job_executions_project_id_idx" ON "job_executions"("project_id");

-- AddForeignKey
ALTER TABLE "eval_templates" ADD CONSTRAINT "eval_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_configurations" ADD CONSTRAINT "job_configurations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_configurations" ADD CONSTRAINT "job_configurations_eval_template_id_fkey" FOREIGN KEY ("eval_template_id") REFERENCES "eval_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_configuration_id_fkey" FOREIGN KEY ("job_configuration_id") REFERENCES "job_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_input_trace_id_fkey" FOREIGN KEY ("job_input_trace_id") REFERENCES "traces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_output_score_id_fkey" FOREIGN KEY ("job_output_score_id") REFERENCES "scores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240408134328_prompt_table_add_tags
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240408134328_prompt_table_add_tags\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "prompts" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ==================================================
-- 来源文件夹: 20240408134330_prompt_table_add_index_to_tags
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240408134330_prompt_table_add_index_to_tags\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "prompts_tags_idx" ON "prompts" USING GIN ("tags" array_ops);

-- ==================================================
-- 来源文件夹: 20240411134330_model_updates
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240411134330_model_updates\migration.sql
-- ==================================================

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- https://ai.google.dev/models/gemini#model-variations
    -- https://cloud.google.com/vertex-ai/generative-ai/pricing
    ('cluv2sjeo000008ih0fv23hi0', NULL, 'gemini-1.0-pro-latest', '(?i)^(gemini-1.0-pro-latest)(@[a-zA-Z0-9]+)?$', NULL, 0.00000025, 0.0000005, NULL, 'CHARACTERS', NULL, NULL),
    -- stable versions priced differently
    -- https://developers.googleblog.com/2024/02/gemini-15-available-for-private-preview-in-google-ai-studio.html
    ('cluv2subq000108ih2mlrga6a', NULL, 'gemini-1.0-pro', '(?i)^(gemini-1.0-pro)(@[a-zA-Z0-9]+)?$', '2024-02-15', 0.000000125, 0.000000375, NULL, 'CHARACTERS', NULL, NULL),
    ('cluv2sx04000208ihbek75lsz', NULL, 'gemini-1.0-pro-001', '(?i)^(gemini-1.0-pro-001)(@[a-zA-Z0-9]+)?$', '2024-02-15', 0.000000125, 0.000000375, NULL, 'CHARACTERS', NULL, NULL),
    ('cluv2szw0000308ihch3n79x7', NULL, 'gemini-pro', '(?i)^(gemini-pro)(@[a-zA-Z0-9]+)?$', '2024-02-15', 0.000000125, 0.000000375, NULL, 'CHARACTERS', NULL, NULL),

    ('cluv2t2x0000408ihfytl45l1', NULL, 'gemini-1.5-pro-latest', '(?i)^(gemini-1.5-pro-latest)(@[a-zA-Z0-9]+)?$', NULL, 0.0000025, 0.0000075, NULL, 'CHARACTERS', NULL, NULL),

    -- https://platform.openai.com/docs/models/continuous-model-upgrades
    ('cluv2t5k3000508ih5kve9zag', NULL, 'gpt-4-turbo-2024-04-09', '(?i)^(gpt-4-turbo-2024-04-09)$', NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-1106-preview" }');




-- ==================================================
-- 来源文件夹: 20240411194142_update_job_config_status
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240411194142_update_job_config_status\migration.sql
-- ==================================================

-- CreateEnum
CREATE TYPE "JobConfigState" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "job_configurations" ADD COLUMN     "status" "JobConfigState" NOT NULL DEFAULT 'ACTIVE';

-- ==================================================
-- 来源文件夹: 20240411224142_update_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240411224142_update_models\migration.sql
-- ==================================================

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- https://platform.openai.com/docs/models/continuous-model-upgrades
    ('cluvpl4ls000008l6h2gx3i07', NULL, 'gpt-4-turbo', '(?i)^(gpt-4-turbo)$', NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-1106-preview" }');

-- ==================================================
-- 来源文件夹: 20240414203636_ee_add_sso_configs
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240414203636_ee_add_sso_configs\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "sso_configs" (
                               "domain" TEXT NOT NULL,
                               "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               "auth_provider" TEXT NOT NULL,
                               "auth_config" JSONB,

                               CONSTRAINT "sso_configs_pkey" PRIMARY KEY ("domain")
);

-- ==================================================
-- 来源文件夹: 20240415235737_index_models_model_name
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240415235737_index_models_model_name\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "models_model_name_idx" ON "models"("model_name");

-- ==================================================
-- 来源文件夹: 20240416173813_add_internal_model_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240416173813_add_internal_model_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_internal_model_idx" ON "observations"("internal_model");

-- ==================================================
-- 来源文件夹: 20240417102742_metadata_on_dataset_and_dataset_item
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240417102742_metadata_on_dataset_and_dataset_item\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "dataset_items" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "metadata" JSONB;

-- ==================================================
-- 来源文件夹: 20240419152924_posthog_integration_settings
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240419152924_posthog_integration_settings\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "posthog_integrations" (
                                        "project_id" TEXT NOT NULL,
                                        "encrypted_posthog_api_key" TEXT NOT NULL,
                                        "posthog_host_name" TEXT NOT NULL,
                                        "last_sync_at" TIMESTAMP(3),
                                        "enabled" BOOLEAN NOT NULL,

                                        CONSTRAINT "posthog_integrations_pkey" PRIMARY KEY ("project_id")
);

-- CreateIndex
CREATE INDEX "posthog_integrations_project_id_idx" ON "posthog_integrations"("project_id");

-- AddForeignKey
ALTER TABLE "posthog_integrations" ADD CONSTRAINT "posthog_integrations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240420134232_posthog_integration_created_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240420134232_posthog_integration_created_at\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "posthog_integrations" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ==================================================
-- 来源文件夹: 20240423174013_update_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240423174013_update_models\migration.sql
-- ==================================================

DELETE FROM models WHERE id = 'cluv2t5k3000508ih5kve9zag';
DELETE FROM models WHERE id = 'clrkvq6iq000008ju6c16gynt';

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- updating tokenizer model to gpt-4-turbo-2024-04-09
    ('cluv2t5k3000508ih5kve9zag', NULL, 'gpt-4-turbo-2024-04-09', '(?i)^(gpt-4-turbo-2024-04-09)$', NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-turbo-2024-04-09" }'),

    -- update gpt-4-1106-preview naming replacing gpt-4-turbo
    ('clrkvq6iq000008ju6c16gynt', NULL, 'gpt-4-1106-preview', '(?i)^(gpt-4-1106-preview)$', NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-1106-preview" }'),

    -- apparently azure supports gpt-4-preview
    ('clv2o2x0p000008jsf9afceau', NULL, ' gpt-4-preview', '(?i)^(gpt-4-preview)$',  NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4-turbo-preview" }');


-- ==================================================
-- 来源文件夹: 20240423192655_add_llm_api_keys
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240423192655_add_llm_api_keys\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "llm_api_keys" (
                                "id" TEXT NOT NULL,
                                "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                "provider" TEXT NOT NULL,
                                "display_secret_key" TEXT NOT NULL,
                                "secret_key" TEXT NOT NULL,
                                "project_id" TEXT NOT NULL,

                                CONSTRAINT "llm_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "llm_api_keys_id_key" ON "llm_api_keys"("id");

-- CreateIndex
CREATE INDEX "llm_api_keys_project_id_provider_idx" ON "llm_api_keys"("project_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "llm_api_keys_project_id_provider_key" ON "llm_api_keys"("project_id", "provider");

-- AddForeignKey
ALTER TABLE "llm_api_keys" ADD CONSTRAINT "llm_api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240424150909_add_job_execution_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240424150909_add_job_execution_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "job_executions_project_id_status_idx" ON "job_executions"("project_id", "status");

-- ==================================================
-- 来源文件夹: 20240429124411_add_prompt_version_labels
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240429124411_add_prompt_version_labels\migration.sql
-- ==================================================

BEGIN;

-- Step 1: Alter the 'prompts' table to add the 'labels' column
ALTER TABLE prompts
    ADD COLUMN labels TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 2: Update the 'labels' column to include 'production' for active prompts
UPDATE prompts
SET labels = array_append(labels, 'production')
WHERE is_active = TRUE;

-- Step 3: Drop the required constraint on 'is_active' column.
ALTER TABLE prompts
    ALTER COLUMN is_active DROP NOT NULL;

COMMIT;

-- ==================================================
-- 来源文件夹: 20240429194411_add_latest_prompt_tag
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240429194411_add_latest_prompt_tag\migration.sql
-- ==================================================

UPDATE
    prompts
SET
    labels = array_append(labels, 'latest')
WHERE
    id = (
        SELECT
            id
        FROM
            prompts AS p2
        WHERE
            p2.name = prompts.name
        ORDER BY
            created_at DESC
    LIMIT 1);

-- ==================================================
-- 来源文件夹: 20240503125742_traces_add_createdat_updatedat
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240503125742_traces_add_createdat_updatedat\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "traces" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ==================================================
-- 来源文件夹: 20240503130335_traces_index_created_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240503130335_traces_index_created_at\migration.sql
-- ==================================================

-- CreateIndex

CREATE INDEX CONCURRENTLY "traces_created_at_idx" ON "traces"("created_at");

-- ==================================================
-- 来源文件夹: 20240503130520_traces_index_updated_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240503130520_traces_index_updated_at\migration.sql
-- ==================================================

-- CreateIndex

CREATE INDEX CONCURRENTLY "traces_updated_at_idx" ON "traces"("updated_at");

-- ==================================================
-- 来源文件夹: 20240508132621_scores_add_project_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240508132621_scores_add_project_id\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "project_id" TEXT;

-- ==================================================
-- 来源文件夹: 20240508132735_scores_add_projectid_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240508132735_scores_add_projectid_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "scores_project_id_idx" ON "scores"("project_id");

-- ==================================================
-- 来源文件夹: 20240508132736_scores_backfill_project_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240508132736_scores_backfill_project_id\migration.sql
-- ==================================================

-- Backfill project_id on existing scores based on linked trace_id
UPDATE scores
SET project_id = traces.project_id
    FROM traces
WHERE scores.trace_id = traces.id AND scores.project_id IS NULL;

-- ==================================================
-- 来源文件夹: 20240512151529_rename_memberships_to_project_memberships
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240512151529_rename_memberships_to_project_memberships\migration.sql
-- ==================================================

-- Rename table, will cause a downtime as it needs to be locked and synced with TRPC API
ALTER TABLE "memberships"
    RENAME TO "project_memberships";

-- AlterTable
ALTER TABLE "project_memberships" RENAME CONSTRAINT "memberships_pkey" TO "project_memberships_pkey";

-- RenameForeignKey
ALTER TABLE "project_memberships" RENAME CONSTRAINT "memberships_project_id_fkey" TO "project_memberships_project_id_fkey";

-- RenameForeignKey
ALTER TABLE "project_memberships" RENAME CONSTRAINT "memberships_user_id_fkey" TO "project_memberships_user_id_fkey";

-- RenameIndex
ALTER INDEX "memberships_user_id_idx" RENAME TO "project_memberships_user_id_idx";

-- ==================================================
-- 来源文件夹: 20240512155020_rename_enum_membership_role_to_project_role
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240512155020_rename_enum_membership_role_to_project_role\migration.sql
-- ==================================================

-- Goal: Rename the enum `MembershipRole` to `ProjectRole` and update all tables that use it

-- Create a new Enum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- Add a temporary column to tables (for each table)
ALTER TABLE "audit_logs" ADD COLUMN "user_project_role_temp" text;
ALTER TABLE "membership_invitations" ADD COLUMN "role_temp" text;
ALTER TABLE "project_memberships" ADD COLUMN "role_temp" text;

-- Copy data over to temporary columns (for each table)
UPDATE "audit_logs" SET "user_project_role_temp" = "user_project_role"::text;
UPDATE "membership_invitations" SET "role_temp" = "role"::text;
UPDATE "project_memberships" SET "role_temp" = "role"::text;

-- Drop old columns
ALTER TABLE "audit_logs" DROP COLUMN "user_project_role";
ALTER TABLE "membership_invitations" DROP COLUMN "role";
ALTER TABLE "project_memberships" DROP COLUMN "role";

-- Rename temporary columns to old column names
ALTER TABLE "audit_logs" RENAME COLUMN "user_project_role_temp" TO "user_project_role";
ALTER TABLE "membership_invitations" RENAME COLUMN "role_temp" TO "role";
ALTER TABLE "project_memberships" RENAME COLUMN "role_temp" TO "role";

-- Convert the text columns to enum columns (for each table)
ALTER TABLE "audit_logs" ALTER COLUMN "user_project_role" TYPE "ProjectRole" USING "user_project_role"::"ProjectRole";
ALTER TABLE "membership_invitations" ALTER COLUMN "role" TYPE "ProjectRole" USING "role"::"ProjectRole";
ALTER TABLE "project_memberships" ALTER COLUMN "role" TYPE "ProjectRole" USING "role"::"ProjectRole";

-- Make the columns NOT NULL (for each table)
ALTER TABLE "audit_logs" ALTER COLUMN "user_project_role" SET NOT NULL;
ALTER TABLE "membership_invitations" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "project_memberships" ALTER COLUMN "role" SET NOT NULL;

-- Now finally, you can drop your old enum
DROP TYPE "MembershipRole";

-- ==================================================
-- 来源文件夹: 20240512155021_add_pricing_gpt4o
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240512155021_add_pricing_gpt4o\migration.sql
-- ==================================================

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- gpt-4o
    ('b9854a5c92dc496b997d99d20', NULL, 'gpt-4o', '(?i)^(gpt-4o)$', NULL, 0.000005, 0.000015, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4o" }'),

    -- gpt-4o-2024-05-13
    ('b9854a5c92dc496b997d99d21', NULL, 'gpt-4o-2024-05-13', '(?i)^(gpt-4o-2024-05-13)$', NULL, 0.000005, 0.000015, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4o-2024-05-13" }');


-- ==================================================
-- 来源文件夹: 20240512155021_scores_drop_fk_on_traces_and_observations
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240512155021_scores_drop_fk_on_traces_and_observations\migration.sql
-- ==================================================

-- DropForeignKey
ALTER TABLE "scores" DROP CONSTRAINT "scores_observation_id_fkey";

-- DropForeignKey
ALTER TABLE "scores" DROP CONSTRAINT "scores_trace_id_fkey";

-- ==================================================
-- 来源文件夹: 20240512155022_scores_non_null_and_add_fk_project_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240512155022_scores_non_null_and_add_fk_project_id\migration.sql
-- ==================================================

/*
  Warnings:

  - Made the column `project_id` on table `scores` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "scores" ALTER COLUMN "project_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240513082203_scores_unique_id_and_projectid_instead_of_id_and_traceid
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240513082203_scores_unique_id_and_projectid_instead_of_id_and_traceid\migration.sql
-- ==================================================

/*
  Warnings:

  - A unique constraint covering the columns `[id,project_id]` on the table `scores` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "scores_id_trace_id_key";

-- ==================================================
-- 来源文件夹: 20240513082204_scores_unique_id_and_projectid_instead_of_id_and_traceid_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240513082204_scores_unique_id_and_projectid_instead_of_id_and_traceid_index\migration.sql
-- ==================================================

/*
  Warnings:

  - A unique constraint covering the columns `[id,project_id]` on the table `scores` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX CONCURRENTLY "scores_id_project_id_key" ON "scores"("id", "project_id");

-- ==================================================
-- 来源文件夹: 20240513082205_observations_view_add_time_to_first_token
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240513082205_observations_view_add_time_to_first_token\migration.sql
-- ==================================================

CREATE OR REPLACE VIEW "observations_view" AS
SELECT
    o.*,
    m.id AS "model_id",
    m.start_date AS "model_start_date",
    m.input_price,
    m.output_price,
    m.total_price,
    m.tokenizer_config AS "tokenizer_config",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.prompt_tokens::decimal * m.input_price
        ELSE
            o.input_cost
END AS "calculated_input_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.completion_tokens::decimal * m.output_price
        ELSE
            o.output_cost
END AS "calculated_output_cost",
    CASE
        WHEN o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            CASE
                WHEN m.total_price IS NOT NULL AND o.total_tokens IS NOT NULL THEN
                    m.total_price * o.total_tokens
                ELSE
                    o.prompt_tokens::decimal * m.input_price +
                    o.completion_tokens::decimal * m.output_price
END
ELSE
            o.total_cost
END AS "calculated_total_cost",
    CASE WHEN o.end_time IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM o."end_time") - EXTRACT(EPOCH FROM o."start_time"))::double precision END AS "latency",
    CASE WHEN o.completion_start_time IS NOT NULL AND o.start_time IS NOT NULL THEN EXTRACT(EPOCH FROM (completion_start_time - start_time))::double precision ELSE NULL END as "time_to_first_token"

FROM
    observations o
LEFT JOIN LATERAL (
    SELECT
        models.*
    FROM
        models
    WHERE (models.project_id = o.project_id OR models.project_id IS NULL)
    AND models.model_name = o.internal_model
    AND (models.start_date < o.start_time OR models.start_date IS NULL)
    AND o.unit::TEXT = models.unit
    ORDER BY
        models.project_id ASC, -- in postgres, NULLs are sorted last when ordering ASC
        models.start_date DESC NULLS LAST -- now, NULLs are sorted last when ordering DESC as well
    LIMIT 1
) m ON TRUE;


-- requirements:
-- 1. The view should return all columns from the observations table
-- 2. The view should match with only one model for each observation if:
--     a. The model has the same project_id as the observation, otherwise the model without project_id.
--     b. The model has the same model_name as the observation
--     c. The model has a start_date that is less than the observation start_time, otherwise the model without start_date
--     d. The model has the same unit as the observation

-- ==================================================
-- 来源文件夹: 20240522081254_scores_add_author_user_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240522081254_scores_add_author_user_id\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "author_user_id" TEXT;

-- ==================================================
-- 来源文件夹: 20240522095738_scores_add_author_user_id_index
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240522095738_scores_add_author_user_id_index\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "scores_author_user_id_idx" ON "scores"("author_user_id");

-- ==================================================
-- 来源文件夹: 20240523142425_score_config_add_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240523142425_score_config_add_table\migration.sql
-- ==================================================

-- CreateEnum
CREATE TYPE "ScoreDataType" AS ENUM ('CATEGORICAL', 'NUMERIC');

-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "config_id" TEXT,
ADD COLUMN     "data_type" "ScoreDataType" NOT NULL DEFAULT 'NUMERIC',
ADD COLUMN     "string_value" TEXT;

-- CreateTable
CREATE TABLE "score_configs" (
                                 "id" TEXT NOT NULL,
                                 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "project_id" TEXT NOT NULL,
                                 "name" TEXT NOT NULL,
                                 "data_type" "ScoreDataType" NOT NULL,
                                 "is_archived" BOOLEAN NOT NULL DEFAULT false,
                                 "min_value" DOUBLE PRECISION,
                                 "max_value" DOUBLE PRECISION,
                                 "categories" JSONB,
                                 "description" TEXT,

                                 CONSTRAINT "score_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "score_configs_data_type_idx" ON "score_configs"("data_type");

-- CreateIndex
CREATE INDEX "score_configs_is_archived_idx" ON "score_configs"("is_archived");

-- CreateIndex
CREATE INDEX "score_configs_project_id_idx" ON "score_configs"("project_id");

-- CreateIndex
CREATE INDEX "score_configs_categories_idx" ON "score_configs"("categories");

-- CreateIndex
CREATE UNIQUE INDEX "score_configs_id_project_id_key" ON "score_configs"("id", "project_id");

-- AddForeignKey
ALTER TABLE "score_configs" ADD CONSTRAINT "score_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240523142524_scores_add_config_id_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240523142524_scores_add_config_id_idx\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "scores_config_id_idx" ON "scores"("config_id");

-- ==================================================
-- 来源文件夹: 20240523142610_scores_add_fk_scores_config_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240523142610_scores_add_fk_scores_config_id\migration.sql
-- ==================================================

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "score_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240524154058_scores_source_enum_add_annotation
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240524154058_scores_source_enum_add_annotation\migration.sql
-- ==================================================

-- AlterEnum
ALTER TYPE "ScoreSource" ADD VALUE 'ANNOTATION';

-- ==================================================
-- 来源文件夹: 20240524156058_scores_source_backfill_annotation_for_review
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240524156058_scores_source_backfill_annotation_for_review\migration.sql
-- ==================================================

-- Backfill the scores source for 'REVIEW' to be 'ANNOTATION'
UPDATE "scores"
SET "source" = 'ANNOTATION'::"ScoreSource"
WHERE "source" = 'REVIEW'::"ScoreSource";

-- ==================================================
-- 来源文件夹: 20240524165931_scores_source_enum_drop_review
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240524165931_scores_source_enum_drop_review\migration.sql
-- ==================================================

/*
  Warnings:

  - The values [REVIEW] on the enum `ScoreSource` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ScoreSource_new" AS ENUM ('ANNOTATION', 'API', 'EVAL');
ALTER TABLE "scores" ALTER COLUMN "source" TYPE "ScoreSource_new" USING ("source"::text::"ScoreSource_new");
ALTER TYPE "ScoreSource" RENAME TO "ScoreSource_old";
ALTER TYPE "ScoreSource_new" RENAME TO "ScoreSource";
DROP TYPE "ScoreSource_old";
COMMIT;

-- ==================================================
-- 来源文件夹: 20240524190433_job_executions_add_fk_index_config_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240524190433_job_executions_add_fk_index_config_id\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "job_executions_job_configuration_id_idx" ON "job_executions"("job_configuration_id");

-- ==================================================
-- 来源文件夹: 20240524190434_job_executions_add_fk_index_score_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240524190434_job_executions_add_fk_index_score_id\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "job_executions_job_output_score_id_idx" ON "job_executions"("job_output_score_id");

-- ==================================================
-- 来源文件夹: 20240524190435_job_executions_add_fk_index_trace_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240524190435_job_executions_add_fk_index_trace_id\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "job_executions_job_input_trace_id_idx" ON "job_executions"("job_input_trace_id");

-- ==================================================
-- 来源文件夹: 20240524190436_job_executions_index_created_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240524190436_job_executions_index_created_at\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "job_executions_created_at_idx" ON "job_executions"("created_at");

-- ==================================================
-- 来源文件夹: 20240528214726_add_cursor_new_columns_observations
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214726_add_cursor_new_columns_observations\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ==================================================
-- 来源文件夹: 20240528214727_add_cursor_new_columns_scores
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214727_add_cursor_new_columns_scores\migration.sql
-- ==================================================


-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_01
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_01\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "audit_logs_updated_at_idx" ON "audit_logs"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_02
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_02\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "dataset_items_created_at_idx" ON "dataset_items"("created_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_03
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_03\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "dataset_items_updated_at_idx" ON "dataset_items"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_04
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_04\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "dataset_run_items_created_at_idx" ON "dataset_run_items"("created_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_05
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_05\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "dataset_run_items_updated_at_idx" ON "dataset_run_items"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_06
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_06\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "dataset_runs_created_at_idx" ON "dataset_runs"("created_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_07
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_07\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "dataset_runs_updated_at_idx" ON "dataset_runs"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_08
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_08\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "datasets_created_at_idx" ON "datasets"("created_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_09
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_09\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "datasets_updated_at_idx" ON "datasets"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_10
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_10\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "job_executions_updated_at_idx" ON "job_executions"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_11
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_11\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_updated_at_idx" ON "observations"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_12
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_12\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "prompts_created_at_idx" ON "prompts"("created_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_13
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_13\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "prompts_updated_at_idx" ON "prompts"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_14
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_14\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "score_configs_created_at_idx" ON "score_configs"("created_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_15
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_15\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "score_configs_updated_at_idx" ON "score_configs"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_16
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_16\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "scores_created_at_idx" ON "scores"("created_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_17
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_17\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "scores_updated_at_idx" ON "scores"("updated_at");

-- ==================================================
-- 来源文件夹: 20240528214728_add_cursor_index_18
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240528214728_add_cursor_index_18\migration.sql
-- ==================================================


-- CreateIndex
CREATE INDEX CONCURRENTLY "trace_sessions_updated_at_idx" ON "trace_sessions"("updated_at");

-- ==================================================
-- 来源文件夹: 20240603212024_dataset_items_add_index_source_trace_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240603212024_dataset_items_add_index_source_trace_id\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "dataset_items_source_trace_id_idx" ON "dataset_items" USING HASH ("source_trace_id");

-- ==================================================
-- 来源文件夹: 20240604133338_scores_add_index_name
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240604133338_scores_add_index_name\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX "scores_project_id_name_idx" ON "scores"("project_id", "name");

-- ==================================================
-- 来源文件夹: 20240604133339_score_data_type_add_boolean
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240604133339_score_data_type_add_boolean\migration.sql
-- ==================================================

-- AlterEnum
ALTER TYPE "ScoreDataType" ADD VALUE 'BOOLEAN';

-- ==================================================
-- 来源文件夹: 20240606093356_drop_unused_pricings_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240606093356_drop_unused_pricings_table\migration.sql
-- ==================================================

/*
  Warnings:

  - You are about to drop the `pricings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "pricings";

-- DropEnum
DROP TYPE "PricingUnit";

-- DropEnum
DROP TYPE "TokenType";

-- ==================================================
-- 来源文件夹: 20240606133011_remove_trace_fkey_datasetrunitems
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240606133011_remove_trace_fkey_datasetrunitems\migration.sql
-- ==================================================

-- DropForeignKey
ALTER TABLE "dataset_run_items" DROP CONSTRAINT "dataset_run_items_trace_id_fkey";
ALTER TABLE "dataset_run_items" DROP CONSTRAINT "dataset_run_items_observation_id_fkey";

-- ==================================================
-- 来源文件夹: 20240607090858_pricings_add_latest_gemini_models
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240607090858_pricings_add_latest_gemini_models\migration.sql
-- ==================================================

-- does not include pricing yet, will be added as soon as it is calculated at ingestion time

-- remove model if added by faulty migration, context: https://github.com/langfuse/langfuse/issues/2266
DELETE FROM models WHERE id in ('clx30djsn0000w9mzebiv41we', 'clx30hkrx0000w9mz7lqi0ial');

INSERT INTO "models" ("id", "model_name", "match_pattern", "unit") VALUES ('clx30djsn0000w9mzebiv41we', 'gemini-1.5-flash', '(?i)^(gemini-1.5-flash)(@[a-zA-Z0-9]+)?$', 'CHARACTERS');

INSERT INTO "models" ("id", "model_name", "match_pattern", "unit") VALUES ('clx30hkrx0000w9mz7lqi0ial', 'gemini-1.5-pro', '(?i)^(gemini-1.5-pro)(@[a-zA-Z0-9]+)?$', 'CHARACTERS');

-- ==================================================
-- 来源文件夹: 20240607212419_model_price_anthropic_via_google_vertex
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240607212419_model_price_anthropic_via_google_vertex\migration.sql
-- ==================================================

-- Google Vertex uses @ to separate model name and version

UPDATE "models" SET "match_pattern" = '(?i)^(claude-3-haiku(-|@)?20240307)$' WHERE "id" = 'cltr0w45b000008k1407o9qv1';

UPDATE "models" SET "match_pattern" = '(?i)^(claude-3-opus(-|@)?20240229)$' WHERE "id" = 'cltgy0iuw000008le3vod1hhy';

UPDATE "models" SET "match_pattern" = '(?i)^(claude-3-sonnet(-|@)?20240229)$' WHERE "id" = 'cltgy0pp6000108le56se7bl3';

-- ==================================================
-- 来源文件夹: 20240611105521_llm_api_keys_custom_endpoints
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240611105521_llm_api_keys_custom_endpoints\migration.sql
-- ==================================================

BEGIN;

ALTER TABLE "llm_api_keys"
    ADD COLUMN "base_url" TEXT,
    ADD COLUMN "adapter" TEXT,
    ADD COLUMN "custom_models" TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    ADD COLUMN "with_default_models" BOOLEAN NOT NULL DEFAULT true;

UPDATE "llm_api_keys"
SET "adapter" = "provider";

ALTER TABLE "llm_api_keys"
    ALTER COLUMN "adapter" SET NOT NULL;

ALTER TABLE "eval_templates"
    ADD COLUMN "provider" TEXT;

UPDATE "eval_templates"
SET "provider" = 'openai';

ALTER TABLE "eval_templates"
    ALTER COLUMN "provider" SET NOT NULL;

COMMIT;

-- ==================================================
-- 来源文件夹: 20240611113517_backfill_manual_score_configs
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240611113517_backfill_manual_score_configs\migration.sql
-- ==================================================

-- Create manual-score config for any project with manual scores and link config_id to scores
BEGIN;
WITH project_configs AS (
INSERT INTO score_configs (id,
                           project_id,
                           name,
                           data_type,
                           is_archived,
                           min_value,
                           max_value,
                           description)
SELECT
    md5(random()::text || clock_timestamp()::text || s.project_id::text)::uuid AS id,
        s.project_id,
    'manual-score',
    'NUMERIC',
    FALSE,
    - 1,
    1,
    'Langfuse legacy annotation score.'
FROM ( SELECT DISTINCT
           project_id
       FROM
           scores
       WHERE
           name = 'manual-score'
         AND config_id IS NULL
         AND source = 'ANNOTATION') s
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            score_configs sc
        WHERE
            sc.name = 'manual-score'
          AND sc.project_id = s.project_id)
    RETURNING
		id,
		project_id
)
UPDATE
    scores
SET
    config_id = pc.id
    FROM
	project_configs pc
WHERE
    scores.project_id = pc.project_id
  AND scores.name = 'manual-score';
COMMIT;

-- ==================================================
-- 来源文件夹: 20240612101858_add_index_observations_project_id_prompt_id
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240612101858_add_index_observations_project_id_prompt_id\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "observations_project_id_prompt_id_idx" ON "observations"("project_id", "prompt_id");

-- ==================================================
-- 来源文件夹: 20240617094803_observations_remove_prompt_fk_constraint
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240617094803_observations_remove_prompt_fk_constraint\migration.sql
-- ==================================================

-- DropForeignKey
ALTER TABLE "observations" DROP CONSTRAINT "observations_prompt_id_fkey";

-- ==================================================
-- 来源文件夹: 20240618134129_add_batch_exports_table
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240618134129_add_batch_exports_table\migration.sql
-- ==================================================

-- CreateTable
CREATE TABLE "batch_exports" (
                                 "id" TEXT NOT NULL,
                                 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "project_id" TEXT NOT NULL,
                                 "user_id" TEXT NOT NULL,
                                 "finished_at" TIMESTAMP(3),
                                 "expires_at" TIMESTAMP(3),
                                 "name" TEXT NOT NULL,
                                 "status" TEXT NOT NULL,
                                 "query" JSONB NOT NULL,
                                 "format" TEXT NOT NULL,
                                 "url" TEXT,
                                 "log" TEXT,

                                 CONSTRAINT "batch_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "batch_exports_project_id_user_id_idx" ON "batch_exports"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "batch_exports_status_idx" ON "batch_exports"("status");

-- AddForeignKey
ALTER TABLE "batch_exports" ADD CONSTRAINT "batch_exports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==================================================
-- 来源文件夹: 20240618164950_drop_observations_parent_observation_id_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240618164950_drop_observations_parent_observation_id_idx\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX CONCURRENTLY IF EXISTS "observations_parent_observation_id_idx";

-- ==================================================
-- 来源文件夹: 20240618164951_drop_observations_updated_at_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240618164951_drop_observations_updated_at_idx\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX CONCURRENTLY IF EXISTS "observations_updated_at_idx";

-- ==================================================
-- 来源文件夹: 20240618164952_drop_scores_updated_at_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240618164952_drop_scores_updated_at_idx\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX CONCURRENTLY IF EXISTS "scores_updated_at_idx";

-- ==================================================
-- 来源文件夹: 20240618164953_drop_traces_external_id_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240618164953_drop_traces_external_id_idx\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX CONCURRENTLY IF EXISTS "traces_external_id_idx";

-- ==================================================
-- 来源文件夹: 20240618164954_drop_traces_release_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240618164954_drop_traces_release_idx\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX CONCURRENTLY IF EXISTS "traces_release_idx";

-- ==================================================
-- 来源文件夹: 20240618164955_drop_traces_updated_at_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240618164955_drop_traces_updated_at_idx\migration.sql
-- ==================================================

-- DropIndex
DROP INDEX CONCURRENTLY IF EXISTS "traces_updated_at_idx";

-- ==================================================
-- 来源文件夹: 20240618164956_create_traces_project_id_timestamp_idx
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240618164956_create_traces_project_id_timestamp_idx\migration.sql
-- ==================================================

-- CreateIndex
CREATE INDEX CONCURRENTLY "traces_project_id_timestamp_idx" ON "traces"("project_id", "timestamp");

-- ==================================================
-- 来源文件夹: 20240624133412_models_add_anthropic_3_5_sonnet
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240624133412_models_add_anthropic_3_5_sonnet\migration.sql
-- ==================================================

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id
)
VALUES
    -- add 3.5 sonnet model
    ('clxt0n0m60000pumz1j5b7zsf', NULL, 'claude-3-5-sonnet-20240620', '(?i)^(claude-3-5-sonnet(-|@)?20240620)$', NULL, 0.000003, 0.000015, NULL, 'TOKENS', 'claude');

-- ==================================================
-- 来源文件夹: 20240625103957_observations_add_calculated_cost_columns
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240625103957_observations_add_calculated_cost_columns\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "calculated_input_cost" DECIMAL(65,30),
ADD COLUMN     "calculated_output_cost" DECIMAL(65,30),
ADD COLUMN     "calculated_total_cost" DECIMAL(65,30),
ADD COLUMN     "internal_model_id" TEXT;

-- ==================================================
-- 来源文件夹: 20240625103958_fix_model_match_gpt4_vision
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240625103958_fix_model_match_gpt4_vision\migration.sql
-- ==================================================

/*
Previously, the pattern did not allow for model specifications like "1106" or any other 4-digit block.
This led to missing models on the generation-update call where the exact model name that was used was provided (including the 4-digit block).
The new pattern allows for:

- "gpt-4-vision-preview" as set on generation-create
- "gpt-4-1106-vision-preview" as set on generation-update

*/

UPDATE
    "models"
SET
    "match_pattern" = '(?i)^(gpt-4(-\d{4})?-vision-preview)$'
WHERE
    "id" = 'clrkvx5gp000108juaogs54ea'
  AND "model_name" = 'gpt-4-turbo-vision';

-- ==================================================
-- 来源文件夹: 20240703214747_models_anthropic_aws_bedrock
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240703214747_models_anthropic_aws_bedrock\migration.sql
-- ==================================================

-- Add AWS Bedrock model names for Anthropic models

UPDATE "models" SET "match_pattern" = '(?i)^(claude-3-haiku-20240307|anthropic\.claude-3-haiku-20240307-v1:0|claude-3-haiku@20240307)$' WHERE "id" = 'cltr0w45b000008k1407o9qv1';

UPDATE "models" SET "match_pattern" = '(?i)^(claude-3-sonnet-20240229|anthropic\.claude-3-sonnet-20240229-v1:0|claude-3-sonnet@20240229)$' WHERE "id" = 'cltgy0pp6000108le56se7bl3';

UPDATE "models" SET "match_pattern" = '(?i)^(claude-3-opus-20240229|anthropic\.claude-3-opus-20240229-v1:0|claude-3-opus@20240229)$' WHERE "id" = 'cltgy0iuw000008le3vod1hhy';

UPDATE "models" SET "match_pattern" = '(?i)^(claude-3-5-sonnet-20240620|anthropic\.claude-3-5-sonnet-20240620-v1:0|claude-3-5-sonnet@20240620)$' WHERE "id" = 'clxt0n0m60000pumz1j5b7zsf';

-- ==================================================
-- 来源文件夹: 20240704103900_observations_view_read_from_calculated
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240704103900_observations_view_read_from_calculated\migration.sql
-- ==================================================

DROP VIEW IF EXISTS "observations_view"; -- Drop view as column was added in 20240528214726_add_cursor_new_columns_observations and update view must have same columns
CREATE VIEW "observations_view" AS -- Specify the columns that should be returned in the view, as calculated columns are added but exist in the observations table already
SELECT
    o.id,
    o.name,
    o.start_time,
    o.end_time,
    o.parent_observation_id,
    o.type,
    o.trace_id,
    o.metadata,
    o.model,
    o."modelParameters",
    o.input,
    o.output,
    o.level,
    o.status_message,
    o.completion_start_time,
    o.completion_tokens,
    o.prompt_tokens,
    o.total_tokens,
    o.version,
    o.project_id,
    o.created_at,
    o.unit,
    o.prompt_id,
    o.input_cost,
    o.output_cost,
    o.total_cost,
    o.internal_model,
    m.id AS "model_id",
    m.start_date AS "model_start_date",
    m.input_price,
    m.output_price,
    m.total_price,
    m.tokenizer_config AS "tokenizer_config",
    CASE
        WHEN o.calculated_input_cost IS NULL AND o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.prompt_tokens::decimal * m.input_price
        ELSE
            COALESCE(o.calculated_input_cost, o.input_cost)
END AS "calculated_input_cost",
    CASE
        WHEN o.calculated_output_cost IS NULL AND o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.completion_tokens::decimal * m.output_price
        ELSE
            COALESCE(o.calculated_output_cost, o.output_cost)
END AS "calculated_output_cost",
    CASE
        WHEN o.calculated_total_cost IS NULL AND o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            CASE
                WHEN m.total_price IS NOT NULL AND o.total_tokens IS NOT NULL THEN
                    m.total_price * o.total_tokens
                ELSE
                    o.prompt_tokens::decimal * m.input_price +
                    o.completion_tokens::decimal * m.output_price
END
ELSE
            COALESCE(o.calculated_total_cost, o.total_cost)
END AS "calculated_total_cost",
    CASE WHEN o.end_time IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM o."end_time") - EXTRACT(EPOCH FROM o."start_time"))::double precision END AS "latency",
    CASE WHEN o.completion_start_time IS NOT NULL AND o.start_time IS NOT NULL THEN EXTRACT(EPOCH FROM (completion_start_time - start_time))::double precision ELSE NULL END as "time_to_first_token"

FROM
    observations o
LEFT JOIN LATERAL (
    SELECT
        models.*
    FROM
        models
    WHERE (models.project_id = o.project_id OR models.project_id IS NULL)
    AND models.model_name = o.internal_model
    AND (models.start_date < o.start_time OR models.start_date IS NULL)
    AND o.unit::TEXT = models.unit
    ORDER BY
        models.project_id ASC, -- in postgres, NULLs are sorted last when ordering ASC
        models.start_date DESC NULLS LAST -- now, NULLs are sorted last when ordering DESC as well
    LIMIT 1
) m ON TRUE;


-- requirements:
-- 1. The view should return all columns from the observations table
-- 2. The view should match with only one model for each observation if:
--     a. The model has the same project_id as the observation, otherwise the model without project_id.
--     b. The model has the same model_name as the observation
--     c. The model has a start_date that is less than the observation start_time, otherwise the model without start_date
--     d. The model has the same unit as the observation

-- ==================================================
-- 来源文件夹: 20240704103901_scores_make_value_optional
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240704103901_scores_make_value_optional\migration.sql
-- ==================================================

-- AlterTable
ALTER TABLE "scores" ALTER COLUMN "value" DROP NOT NULL;

-- ==================================================
-- 来源文件夹: 20240705152639_traces_view_add_created_at_updated_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240705152639_traces_view_add_created_at_updated_at\migration.sql
-- ==================================================

-- Drop and create to be able to change columns, otherwise new t.* cols cannot be added

DROP VIEW IF EXISTS traces_view;
CREATE VIEW traces_view AS
WITH observations_metrics AS (
    SELECT
        trace_id,
        project_id,
        EXTRACT(EPOCH FROM COALESCE(MAX(o.end_time), MAX(o.start_time))) - EXTRACT(EPOCH FROM MIN(o.start_time))::double precision AS duration
        FROM
        observations o
        GROUP BY
        project_id, trace_id
        )
SELECT
    t.*,
    o.duration
FROM
    traces t
        LEFT JOIN observations_metrics o ON t.id = o.trace_id and t.project_id = o.project_id;

-- ==================================================
-- 来源文件夹: 20240705154048_observation_view_add_created_at_updated_at
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240705154048_observation_view_add_created_at_updated_at\migration.sql
-- ==================================================

DROP VIEW IF EXISTS "observations_view"; -- Drop view as column was added in 20240704103900_observations_view_read_from_calculated and update view must have same columns
CREATE VIEW "observations_view" AS -- Specify the columns that should be returned in the view, as calculated columns are added but exist in the observations table already
SELECT
    o.id,
    o.name,
    o.start_time,
    o.end_time,
    o.parent_observation_id,
    o.type,
    o.trace_id,
    o.metadata,
    o.model,
    o."modelParameters",
    o.input,
    o.output,
    o.level,
    o.status_message,
    o.completion_start_time,
    o.completion_tokens,
    o.prompt_tokens,
    o.total_tokens,
    o.version,
    o.project_id,
    o.created_at,
    o.updated_at,
    o.unit,
    o.prompt_id,
    o.input_cost,
    o.output_cost,
    o.total_cost,
    o.internal_model,
    m.id AS "model_id",
    m.start_date AS "model_start_date",
    m.input_price,
    m.output_price,
    m.total_price,
    m.tokenizer_config AS "tokenizer_config",
    CASE
        WHEN o.calculated_input_cost IS NULL AND o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.prompt_tokens::decimal * m.input_price
        ELSE
            COALESCE(o.calculated_input_cost, o.input_cost)
END AS "calculated_input_cost",
    CASE
        WHEN o.calculated_output_cost IS NULL AND o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            o.completion_tokens::decimal * m.output_price
        ELSE
            COALESCE(o.calculated_output_cost, o.output_cost)
END AS "calculated_output_cost",
    CASE
        WHEN o.calculated_total_cost IS NULL AND o.input_cost IS NULL AND o.output_cost IS NULL AND o.total_cost IS NULL THEN
            CASE
                WHEN m.total_price IS NOT NULL AND o.total_tokens IS NOT NULL THEN
                    m.total_price * o.total_tokens
                ELSE
                    o.prompt_tokens::decimal * m.input_price +
                    o.completion_tokens::decimal * m.output_price
END
ELSE
            COALESCE(o.calculated_total_cost, o.total_cost)
END AS "calculated_total_cost",
    CASE WHEN o.end_time IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM o."end_time") - EXTRACT(EPOCH FROM o."start_time"))::double precision END AS "latency",
    CASE WHEN o.completion_start_time IS NOT NULL AND o.start_time IS NOT NULL THEN EXTRACT(EPOCH FROM (completion_start_time - start_time))::double precision ELSE NULL END as "time_to_first_token"

FROM
    observations o
LEFT JOIN LATERAL (
    SELECT
        models.*
    FROM
        models
    WHERE (models.project_id = o.project_id OR models.project_id IS NULL)
    AND models.model_name = o.internal_model
    AND (models.start_date < o.start_time OR models.start_date IS NULL)
    AND o.unit::TEXT = models.unit
    ORDER BY
        models.project_id ASC, -- in postgres, NULLs are sorted last when ordering ASC
        models.start_date DESC NULLS LAST -- now, NULLs are sorted last when ordering DESC as well
    LIMIT 1
) m ON TRUE;


-- requirements:
-- 1. The view should return all columns from the observations table
-- 2. The view should match with only one model for each observation if:
--     a. The model has the same project_id as the observation, otherwise the model without project_id.
--     b. The model has the same model_name as the observation
--     c. The model has a start_date that is less than the observation start_time, otherwise the model without start_date
--     d. The model has the same unit as the observation

-- ==================================================
-- 来源文件夹: 20240710114043_score_configs_drop_empty_categories_array_for_numeric_scores
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240710114043_score_configs_drop_empty_categories_array_for_numeric_scores\migration.sql
-- ==================================================

-- Migration script to update score_configs entries
-- Set categories to NULL where data_type is 'NUMERIC' and categories is an empty array

UPDATE score_configs
SET categories = NULL
WHERE data_type = 'NUMERIC' AND categories IS NOT NULL;

-- ==================================================
-- 来源文件夹: 20240710114044_add_pricing_gpt4o_mini
-- 文件路径: D:\study\langfuse\test\langfuse-2.65.1\packages\shared\prisma\migrations\20240710114044_add_pricing_gpt4o_mini\migration.sql
-- ==================================================

INSERT INTO models (
    id,
    project_id,
    model_name,
    match_pattern,
    start_date,
    input_price,
    output_price,
    total_price,
    unit,
    tokenizer_id,
    tokenizer_config
)
VALUES
    -- gpt-4o-mini
    ('clyrjp56f0000t0mzapoocd7u', NULL, 'gpt-4o-mini', '(?i)^(gpt-4o-mini)$', NULL, 0.00000015, 0.0000006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4o" }'),

    -- gpt-4o-mini-2024-07-18
    ('clyrjpbe20000t0mzcbwc42rg', NULL, 'gpt-4o-mini-2024-07-18', '(?i)^(gpt-4o-mini-2024-07-18)$', NULL, 0.00000015, 0.0000006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4o" }');


-- ==================================================
-- 数据初始化 -- yjw
-- ==================================================

-- 插入用户数据
INSERT INTO "users" (
    "id",
    "name", 
    "email",
    "email_verified",
    "password",
    "image",
    "created_at",
    "updated_at",
    "feature_flags",
    "admin"
) VALUES (
    '20250101',
    'administrator',
    'administrator@orbitai.com',
    NULL,
    '$2a$12$vUqSGCpMLwOYvPPSYraYtuqOIu2tVE8cpgM6j2iHL8E0lchBNMHxW',
    NULL,
    '2025-11-17 08:08:09.344',
    '2025-11-17 08:08:09.344',
    ARRAY[]::TEXT[],
    true
) ON CONFLICT (id) DO NOTHING;

-- 插入项目数据
INSERT INTO "projects" (
    "id",
    "created_at",
    "name",
    "updated_at",
    "cloud_config"
) VALUES (
    '20250101',
    '2025-11-17 08:08:44.134',
    'xinference',
    '2025-11-17 08:08:44.134',
    NULL
) ON CONFLICT (id) DO NOTHING;

-- 插入项目成员关系数据
INSERT INTO "project_memberships" (
    "project_id",
    "user_id",
    "created_at",
    "updated_at",
    "role"
) VALUES (
    '20250101',
    '20250101',
    '2025-11-17 08:34:39.589',
    '2025-11-17 08:34:39.589',
    'OWNER'
) ON CONFLICT ("project_id", "user_id") DO NOTHING;

-- 插入 API 密钥数据
INSERT INTO "api_keys" (
    "id",
    "created_at",
    "note",
    "public_key",
    "hashed_secret_key",
    "display_secret_key",
    "last_used_at",
    "expires_at",
    "project_id",
    "fast_hashed_secret_key"
) VALUES (
    '20250101',
    '2025-11-17 08:08:51.062',
    NULL,
    'pk-lf-8a79d84e-5537-47b7-86bb-ba36257684f2',
    '$2a$11$jL4x7ZtxnaqA5rhxF38t9OLLgAOUBx8Lufxs2f9cv6osgFWzn6VYW',
    'sk-lf-...28de',
    NULL,
    NULL,
    '20250101',
    NULL
) ON CONFLICT (id) DO NOTHING;