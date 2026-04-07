import { createApp } from "../server";

export default async (req: any, res: any) => {
  const app = await createApp();
  return app(req, res);
};
