declare global {
  namespace Express {
    interface Request {
      user?: {
        accountId: string;
        personnelId: string;
        email: string;
        role: string;
        departmentId: string;
      };
    }
  }
}

export {};
