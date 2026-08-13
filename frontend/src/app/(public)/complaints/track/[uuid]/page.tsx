import { ComplaintTracker } from "@/features/complaints/components/ComplaintTracker";

export const metadata = {
  title: "رهگیری شکایت",
};

export default async function ComplaintTrackPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  return <ComplaintTracker initialIdentifier={uuid} />;
}