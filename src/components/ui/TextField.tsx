import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/design/theme';
import { cn } from '@/lib/cn';

export type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
};

/** Champ de saisie : libellé visible, aide, erreur annoncée, focus visible (bordure encre 2 px). */
export function TextField({ label, hint, error, className, onFocus, onBlur, multiline, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View className={cn('gap-1', className)}>
      <Text variant="caption" className="font-semibold">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.inkSoft}
        maxFontSizeMultiplier={1.6}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        multiline={multiline}
        className={cn(
          'min-h-tap rounded-field bg-surface px-4 font-body text-md text-ink',
          multiline ? 'min-h-[96px] py-3' : 'py-3',
          error ? 'border-2 border-danger' : focused ? 'border-2 border-ink' : 'border border-line',
        )}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="soft">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
