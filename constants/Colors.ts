// constants/Colors.ts

export interface ColorTheme {
    lilacBlue: string;
    solidBlue: string;
    sailingBlue: string;
    dive: string;
    deepSea: string;
    nightTime: string;
    white: string;
    error: string;
    text: string;
    background: string;
    card: string;
    border: string;
}

export const lightTheme: ColorTheme = {
    lilacBlue: '#788FA6', // Darker lilac for readability on light
    solidBlue: '#1F4788', // Slightly deeper blue for light mode contrast
    sailingBlue: '#C8D9EB', // Light borders
    dive: '#488AC7',
    deepSea: '#FFFFFF', // Pure white for cards in light mode
    nightTime: '#F2F2F7', // iOS style light background
    white: '#1C1C1E',     // Map "white" used as explicit foreground text to dark gray
    error: '#FF3B30',
    text: '#1C1C1E',
    background: '#F2F2F7',
    card: '#FFFFFF',
    border: '#C8D9EB',
};

export const darkTheme: ColorTheme = {
    lilacBlue: '#C8D9EB', 
    solidBlue: '#2C5EA8', 
    sailingBlue: '#003366', 
    dive: '#488AC7', 
    deepSea: '#002642', 
    nightTime: '#0C0F14', 
    white: '#FFFFFF',
    error: '#FF4C4C',
    text: '#FFFFFF',
    background: '#0C0F14',
    card: '#002642',
    border: '#003366',
};

export const Colors = darkTheme;
export default Colors;
