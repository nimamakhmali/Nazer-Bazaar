import { AdminComplaintDetailClient } from "./AdminComplaintDetailClient";

interface PageProps {
  params: Promise<{ uuid: string }>;
}

export default async function AdminComplaintDetailPage({ params }: PageProps) {
  const { uuid } = await params;
  return <AdminComplaintDetailClient uuid={uuid} />;
}