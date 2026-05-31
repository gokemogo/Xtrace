// Model type definition (替代 @prisma/client 的 Model 类型)
// 在 DM8 模式下，不依赖 Prisma Client

export interface Model {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  projectId: string | null;
  modelName: string;
  matchPattern: string;
  startDate: Date | null;
  inputPrice: any | null;
  outputPrice: any | null;
  totalPrice: any | null;
  unit: string;
  tokenizerId: string | null;
  tokenizerConfig: any | null;
}
