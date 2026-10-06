import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/EmptyState'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <EmptyState
        title="This page took a different route."
        description="The link may be broken, or the page may have moved."
        action={
          <Link to="/" className={buttonVariants()}>
            Take me home
          </Link>
        }
      />
    </div>
  )
}
