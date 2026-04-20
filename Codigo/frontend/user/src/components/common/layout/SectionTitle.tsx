import type { ElementType, ReactNode } from 'react';

import logo from '@/assets/logo.jpg';
import { cn } from '@/lib/utils';

type SectionTitleProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
  logoClassName?: string;
};

const SectionTitle = ({
  as,
  children,
  className,
  wrapperClassName,
  logoClassName,
}: SectionTitleProps) => {
  const Tag = as ?? 'h2';

  return (
    <div className={cn('flex items-center gap-3', wrapperClassName)}>
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className={cn(
          'h-8 w-8 shrink-0 rounded-md object-cover shadow-sm ring-1 ring-[#024059]/15',
          logoClassName,
        )}
      />
      <Tag className={className}>{children}</Tag>
    </div>
  );
};

export default SectionTitle;
