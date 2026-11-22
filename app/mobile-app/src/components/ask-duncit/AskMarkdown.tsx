import { Linking } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { parseAnswerMarkdown, type MdSpan } from '@duncit/utils';

import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * An answer, drawn from the shared Markdown parse (@duncit/utils) — the same
 * structure mWeb's MarkdownView draws. Never HTML; links are http(s) only.
 */
function Spans({ spans, color }: Readonly<{ spans: MdSpan[]; color: string }>) {
  return (
    <>
      {spans.map((span, index) => (
        <Text
          key={`${index}-${span.text.slice(0, 8)}`}
          color={span.href ? '$primary' : color}
          fontWeight={span.bold ? '700' : undefined}
          fontStyle={span.italic ? 'italic' : undefined}
          backgroundColor={span.code ? '$soft' : undefined}
          textDecorationLine={span.href ? 'underline' : undefined}
          onPress={
            span.href ? () => fireAndForget(Linking.openURL(span.href as string)) : undefined
          }
          role={span.href ? 'link' : undefined}
        >
          {span.text}
        </Text>
      ))}
    </>
  );
}

const HEADING_SIZE = { 1: 18, 2: 16, 3: 15 } as const;

export function AskMarkdown({
  text,
  color = '$color',
}: Readonly<{ text: string; color?: string }>) {
  const blocks = parseAnswerMarkdown(text);
  return (
    <YStack gap={8}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          return (
            <Text key={key} fontSize={HEADING_SIZE[block.level]} fontWeight="700" color={color}>
              <Spans spans={block.spans} color={color} />
            </Text>
          );
        }
        if (block.type === 'paragraph') {
          return (
            <Text key={key} fontSize={14} lineHeight={20} color={color}>
              <Spans spans={block.spans} color={color} />
            </Text>
          );
        }
        return (
          <YStack key={key} gap={4}>
            {block.items.map((item, i) => (
              <XStack key={`${key}-${i}`} gap={6}>
                <Text fontSize={14} color={color}>
                  {block.type === 'numbered' ? `${block.start + i}.` : '•'}
                </Text>
                <Text flex={1} fontSize={14} lineHeight={20} color={color}>
                  <Spans spans={item} color={color} />
                </Text>
              </XStack>
            ))}
          </YStack>
        );
      })}
    </YStack>
  );
}
