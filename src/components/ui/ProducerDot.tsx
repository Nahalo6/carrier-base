import { producerDotColor } from '@/lib/utils';

export default function ProducerDot({ pid, size = 10 }: { pid: string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: producerDotColor(pid),
        marginRight: 2,
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    />
  );
}
