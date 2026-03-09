import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import ReportUserModal from './ReportUserModal';

interface ReportUserButtonProps {
  reportedUserId: string;
  reportedUserName?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

export default function ReportUserButton({
  reportedUserId,
  reportedUserName,
  variant = 'ghost',
  size = 'sm',
  className,
}: ReportUserButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`text-destructive hover:text-destructive ${className || ''}`}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-4 w-4 mr-1" />
        Denunciar
      </Button>
      <ReportUserModal
        open={open}
        onOpenChange={setOpen}
        reportedUserId={reportedUserId}
        reportedUserName={reportedUserName}
      />
    </>
  );
}
