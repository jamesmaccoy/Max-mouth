import { redirect } from 'next/navigation'
import { getMeUser } from '@/utilities/getMeUser'
import PackageDashboard from './PackageDashboard'

export default async function PackageManagePage() {
  const meUser = await getMeUser()
  
  // Check if user is authenticated and has host role
  if (!meUser?.user) {
    redirect('/login?redirect=/manage/packages')
  }
  
  if (!(meUser.user as any).role?.includes('host') && !(meUser.user as any).role?.includes('admin')) {
    redirect('/')
  }
  
  return <PackageDashboard user={meUser.user} />
} 