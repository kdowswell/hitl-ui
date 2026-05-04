import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import "./globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        // Each entry corresponds to a class on <html> that re-declares the
        // shadcn-style tokens (see globals.css). Pick one in the Storybook
        // toolbar to see how the same component renders across themes.
        Default: "",
        "shadcn light": "shadcn-light",
        "shadcn dark": "shadcn-dark",
        "Brand orange": "brand-orange",
        "Brand teal": "brand-teal",
      },
      defaultTheme: "Default",
    }),
  ],
};

export default preview;
