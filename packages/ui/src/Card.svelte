<script lang="ts">
export let title: string | undefined = undefined;
export let subtitle: string | undefined = undefined;
export let className: string = '';

$: classes = `rounded-lg border bg-white p-6 shadow-sm ${className}`;
</script>

<div class={classes}>
  {#if title || subtitle}
    <div class="mb-4">
      {#if title}
        <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
      {/if}
      {#if subtitle}
        <p class="text-sm text-gray-600">{subtitle}</p>
      {/if}
    </div>
  {/if}

  <slot />
</div>
