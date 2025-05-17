// UI Functions
function initUI() {
    // Custom cursor
    initCustomCursor();
    
    // Disable zooming
    disableZooming();
    
    // Initialize marked.js
    marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(lang, code).value;
            }
            return hljs.highlightAuto(code).value;
        }
    });
    
    // Load hljs for syntax highlighting
    const hljsScript = document.createElement('script');
    hljsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js';
    hljsScript.onload = () => {
        // Load additional languages
        const languages = ['javascript', 'python', 'html', 'css', 'json'];
        languages.forEach(lang => {
            const langScript = document.createElement('script');
            langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/languages/${lang}.min.js`;
            document.head.appendChild(langScript);
        });
    };
    document.head.appendChild(hljsScript);
    
    // Link preview handling
    handleLinkPreviews();
}

// Initialize custom cursor
function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    const trail = document.getElementById('cursor-trail');
    
    document.addEventListener('mousemove', e => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        setTimeout(() => {
            trail.style.left = e.clientX + 'px';
            trail.style.top = e.clientY + 'px';
        }, 100);
    });
    
    // Change cursor style when hovering interactive elements
    const interactiveElements = ['button', 'a', 'input', 'textarea', '[contenteditable]', '.channel', '.dm-item'];
    
    interactiveElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                cursor.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            });
            
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                cursor.style.backgroundColor = 'rgba(114, 137, 218, 0.7)';
            });
        });
    });
}

// Disable zooming
function disableZooming() {
    document.addEventListener('touchmove', function(e) {
        if (e.scale !== 1) { e.preventDefault(); }
    }, { passive: false });
    
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });
}

// Handle link previews
function handleLinkPreviews() {
    // This would be called when messages are loaded to check for links
    // and fetch preview data from a link preview API
    // Implementation would depend on the specific API used
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initUI);
