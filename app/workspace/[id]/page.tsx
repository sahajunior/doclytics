import { WorkspaceView } from './WorkspaceView'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WorkspacePage({ params }: PageProps) {
  const { id } = await params
  return <WorkspaceView workspaceId={id} />
}
