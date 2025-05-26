<script lang="ts">
export let variant: 'primary' | 'secondary' | 'outline' = 'primary';
export let size: 'sm' | 'md' | 'lg' = 'md';
export let disabled: boolean = false;
export let type: 'button' | 'submit' | 'reset' = 'button';

const baseClasses =
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
};

const sizeClasses = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 py-2',
  lg: 'h-12 px-6 text-lg',
};

$: classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
</script>

<button type={type} disabled={disabled} class={classes} on:click>
  <slot />
</button>
