import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HOTKEYS: Record<string, string> = {
  '1..9': 'Select class',
  'A': 'Train AI assistant',
  'S': 'Save mask',
  'Enter': 'Next image',
  'U': 'Undo',
  'E': 'Eraser',
  'D': 'Draw tool',
  'W': 'Move tool',
  'V': 'Change view',
  'F': 'Final mask',
  'G': 'User mask',
  'Space': 'Toggle mask visibility',
  'Shift+Scroll': 'Change brush size',
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'welcome' | 'faqs' | 'hotkeys' | 'about'>('welcome');
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const { theme, actualThemeName } = useTheme();

  useEffect(() => {
    if (isOpen) {
      const originalKeyDownHandler = document.body.onkeydown;
      const originalKeyUpHandler = document.body.onkeyup;
      document.body.onkeydown = (event: KeyboardEvent) => {
        if (event.code === 'Escape') {
          onClose();
          event.preventDefault();
          event.stopPropagation();
        }
      };
      document.body.onkeyup = null;
      return () => {
        document.body.onkeydown = originalKeyDownHandler;
        document.body.onkeyup = originalKeyUpHandler;
      };
    }
  }, [isOpen, onClose]);

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  // Use actualThemeName from ThemeContext for reliable dark mode detection
  const isDarkTheme = actualThemeName === 'dark';
  const iconFilter = isDarkTheme ? 'invert(1) brightness(0.9)' : 'none';
  const inlineIcon = (src: string, alt: string) => (
    <img
      src={src}
      alt={alt}
      style={{
        width: '15px',
        height: '15px',
        verticalAlign: 'middle',
        display: 'inline-block',
        filter: iconFilter,
        margin: '0 2px',
      }}
    />
  );

  const keyStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 7px',
    fontSize: '12px',
    fontFamily: 'monospace',
    fontWeight: 600,
    borderRadius: '4px',
    border: `1px solid ${theme.modalBorder}`,
    backgroundColor: theme.bgTertiary,
    color: theme.gray700,
    margin: '0 2px',
  };

  const accordionBtnStyle = (open: boolean): React.CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${theme.modalBorder}`,
    borderRadius: open ? '8px 8px 0 0' : '8px',
    backgroundColor: open ? theme.bgTertiary : theme.bgSecondary,
    color: theme.gray900,
    marginTop: '6px',
    transition: 'background-color 0.15s',
  });

  const panelStyle = (open: boolean): React.CSSProperties => ({
    display: open ? 'block' : 'none',
    padding: '12px 16px',
    fontSize: '13px',
    lineHeight: 1.6,
    color: theme.gray700,
    backgroundColor: theme.modalBg,
    border: `1px solid ${theme.modalBorder}`,
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
  });

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    border: 'none',
    borderBottom: active ? `2px solid ${theme.primary}` : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? theme.primary : theme.gray500,
    transition: 'color 0.15s, border-color 0.15s',
  });

  const sectionHeading: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 700,
    color: theme.gray900,
    margin: '20px 0 8px',
  };

  const subHeading: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: theme.gray900,
    margin: '16px 0 6px',
  };

  const bodyText: React.CSSProperties = {
    fontSize: '13px',
    lineHeight: 1.6,
    color: theme.gray700,
    margin: '8px 0',
  };

  const linkStyle: React.CSSProperties = {
    color: theme.primary,
    textDecoration: 'none',
  };

  return (
    <div
      data-testid="help-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.modalOverlay,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.modalBg,
          border: `1px solid ${theme.modalBorder}`,
          borderRadius: '12px',
          width: '680px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.25s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: theme.modalHeaderBg,
          borderBottom: `1px solid ${theme.modalBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: theme.gray900, letterSpacing: '-0.01em' }}>
              Help
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.gray500,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.bgTertiary; e.currentTarget.style.color = theme.gray900; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.gray500; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '0 20px', borderBottom: `1px solid ${theme.modalBorder}`, backgroundColor: theme.modalHeaderBg }}>
          {(['welcome', 'faqs', 'hotkeys', 'about'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabBtnStyle(activeTab === tab)} data-testid={`tab-${tab}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* Welcome Tab */}
          {activeTab === 'welcome' && (
            <div>
              <h3 style={sectionHeading}>
                Welcome to <a href="https://github.com/esa-philab/IRIS" target="_blank" rel="noopener noreferrer" style={linkStyle}>IRIS</a>,
                a labelling tool for satellite imagery and datacubes!
              </h3>

              <p style={bodyText}>
                If you're new here, please take a moment to read this page. It will introduce you to some
                of the basic functionality of IRIS. If you ever want to return to this page later simply
                click <b>help</b> {inlineIcon('/segmentation/static/icons/help.png', 'help')}
                at the top-right of the IRIS interface. We recommend that you read through the following step-by-step, and go check out and explore what is described as you go along.
                As you do that, the <b>Hotkeys</b> tab above may be a useful companion.
              </p>

              <h3 style={sectionHeading}>Basic Overview</h3>

              <p style={bodyText}>The IRIS interface consists of three main parts, starting from the top of the screen:</p>

              <ul style={bodyText}>
                <li><b>The Toolbar:</b> Contains all the tools for drawing and editing masks, as well as manipulating and moving around the image</li>
                <li><b>The Views:</b> A set of visualisations of the data to be labelled</li>
                <li><b>The Info Panel:</b> An area where useful information about the project and your labelling work is displayed</li>
              </ul>

              <p style={bodyText}>
                As an annotator in IRIS, your job is to create a <i>segmentation mask</i> for the images you are shown. Painting all those pixels could take you a lot of time, but luckily you
                get to work alongside an <i>AI assistant</i>, which tries to predict the classes of areas which you haven't labelled yourself. You will be iteratively
                labelling areas in the image with the different classes you find (what those classes are depends on the project your working on, but you can find a list of them by pressing the
                {inlineIcon('/segmentation/static/icons/class.png', 'class')}
                button in the toolbar). The AI assistant (a Random Forest model) will then try to predict the classes of areas which you haven't labelled yourself. You can then correct areas
                that it gets wrong, and see if it improves when you retrain the model. You can find some tips and best practices for interacting with the AI assistant in the FAQs.
              </p>

              <p style={bodyText}>
                In your project, you may find multiple images displayed side by side (known as <i>views</i>). This is because IRIS can label data that are not just the standard red-green-blue images we are used to,
                but also images with multiple different bands. These could be different spectral channels (e.g. Infrared), or different information entirely, like maps, elevation data, or
                anything else that you can put on a 2D surface. The creators of a project can define as many views as they like, using those different data sources. IRIS gives you the ability to switch between the
                different pre-defined views, and create whole groups of views that you can switch between easily.
              </p>

              <p style={bodyText}>
                After you get to annotating, the mask that you and your AI assistant create will be displayed as an overlay on top of the image. This is so that you can simultaneously see your labels and what they correspond
                to in the data below. Each class will have been assigned a colour by your project administrator. One detail of IRIS that is useful to keep in mind is that there are different versions of the mask available to
                visualise:
              </p>

              <ul style={bodyText}>
                <li>
                  <b>The final mask{inlineIcon('/segmentation/static/icons/mask_final.png', 'final mask')}:</b> shows a combination of your annotations and model predictions. This is the view that corresponds to the final saved mask, when you complete your work. Your annotations are always favoured against the model.
                </li>
                <li>
                  <b>The user mask {inlineIcon('/segmentation/static/icons/mask_user.png', 'user mask')}:</b> shows only the pixels you have manually annotated. A project will often define one class to be invisible in the final mask (as a way of symbolising some kind of background class), but you should still be able to see the manual labels
                  that you've drawn of that class in the user mask view. This can be useful for checking where you've already annotated, and when erasing annotations.
                </li>
                <li>
                  <b>The error mask{inlineIcon('/segmentation/static/icons/mask_errors.png', 'error mask')}:</b> shows the pixels that the
                  model has predicted correctly (in green) and incorrectly (in red) for the pixels that are used for validating the models (this view does not include pixels that the model was trained on). This is a useful
                  way to see where the model is making mistakes, and where you should focus your labelling efforts.
                </li>
              </ul>

              <h2 style={{ ...sectionHeading, fontSize: '16px', marginTop: '24px' }}>Getting Started</h2>
              <p style={bodyText}>In the following, a typical workflow for a user will be described. Feel free to go sequentially through the points and try them for yourself.</p>

              <h4 style={subHeading}>1. Look around!</h4>
              <p style={bodyText}>
                Use the zoom <span style={keyStyle}>Scrollwheel</span> and navigation<span style={keyStyle}>W</span> tools to take a closer look at the data in front of you. Is it too dark? Too bright? You can use the brightness, saturation and contrast controls located in the toolbar to help you!
              </p>

              <h4 style={subHeading}>2. Change the view</h4>
              <p style={bodyText}>
                Select a few different views with the <span style={keyStyle}>V</span> key and see what they look like. There might be information that's useful which you can't see in the views you are
                initially given! Have a think about the features you can see in the different views, and how they might be useful for labelling. Try using the image adjustment tools mentioned in the previous step too, to make the views as clear as possible.
              </p>

              <h4 style={subHeading}>3. Select a class</h4>
              <p style={bodyText}>
                Now that you've had a look around, you've probably noticed a few things you'd like to start labelling. Select a class from the list of classes in the toolbar. You can also use the <span style={keyStyle}>1..9</span> keys.
              </p>

              <h4 style={subHeading}>4. Start painting!</h4>
              <p style={bodyText}>
                Using the draw tool, and adjusting the paintbrush size with <span style={keyStyle}>Shift+scrollwheel</span>, try painting a few pixels from two or three different classes. Keep it simple, just a few is fine! The classes
                you draw will be highlighted in different colours.
              </p>

              <h4 style={subHeading}>5. Display the mask</h4>
              <p style={bodyText}>
                IRIS's mask comes from a combination of hand-drawn labels, and AI-generated predictions. When you begin annotating an image, these will be blank, but when they are populated they are displayed as a semi-transparent overlay above
                the image views. You can view either the combined predictions between human and model, known as the final mask {inlineIcon('/segmentation/static/icons/mask_final.png', 'final mask')}/<span style={keyStyle}>F</span>,
                or only the annotations you've made, known as the user mask {inlineIcon('/segmentation/static/icons/mask_user.png', 'user mask')}/<span style={keyStyle}>G</span>.
                Try selecting the user mask mode before you begin annotating.
              </p>

              <h4 style={subHeading}>5. Train your AI assistant</h4>
              <p style={bodyText}>
                Now that you've labelled a few pixels, you can train your AI assistant. Click the {inlineIcon('/segmentation/static/icons/ai.png', 'AI')}/<span style={keyStyle}>A</span>
                button in the toolbar, and see what happens! You can use the tools from Step 5 to display the AI predictions, and the spacebar to toggle the mask transparency, allowing you to see the image below easily.
              </p>

              <h4 style={subHeading}>6. Correct your AI assistant</h4>
              <p style={bodyText}>
                Using all the navigation, visualisation, and labelling skills you've just practiced, go ahead and make a few corrections to what the AI predicted. It probably made some mistakes in areas of the image that are
                different to the areas you originally labelled. That's fine! You can just keep retraining and correcting your AI assistant as you go!
              </p>

              <h4 style={subHeading}>7. Save your work</h4>
              <p style={bodyText}>
                When you're done, don't forget to save your work! You can do this by clicking the {inlineIcon('/segmentation/static/icons/save_mask.png', 'save')}/<span style={keyStyle}>S</span>
                button in the toolbar. You can then come back and finish the image any time you like. Or, you can move on to the next image in the project by clicking the {inlineIcon('/segmentation/static/icons/next.png', 'next')}/<span style={keyStyle}>Enter</span>
                button.
              </p>

              <h2 style={{ ...sectionHeading, fontSize: '16px', marginTop: '24px' }}>Think like a robot</h2>
              <p style={bodyText}>
                You and your AI assistant will be more effective as a team if you keep in mind it's strengths and weaknesses. Here are some tips and tricks to get the best out of your new colleague.
              </p>

              <h4 style={subHeading}>1. Input → Output</h4>
              <p style={bodyText}>
                The model only learns from what you give it, so diverse labels will help the model learn about all the different areas in the image, don't just stick to annotating one area of the image, or correcting one kind of mistake.
                Quality over quantity is preferred, as errors in the labels can confuse the model. What you put in is what you get out!
              </p>
              <p style={bodyText}>
                Something else to keep in mind is that each pixel in the image that you label is a training example for the model. This means that the model doesn't understand <i>spatial</i> relationships between pixels. This means if there
                are classes which strongly depend on textural information, it may be difficult for the model to perform well (unless the project administrator has somehow embedded this spatial information in each pixel). In the Preferences menu
                {inlineIcon('/segmentation/static/icons/preferences.png', 'preferences')}, you can add a post-processing step which filters out small areas with
                different classes. This effectively smooths your output spatially, and may help if you have lots of noisy model errors that are difficult to correct manually.
              </p>

              <h4 style={subHeading}>2. Listening Skills</h4>
              <p style={bodyText}>
                Your AI assistant might suggest a class to annotate more of in the right-hand side box of the Information Panel, this can be a useful tip to follow if you're not sure what to do. It gives this advice based on its assessment of how it
                is performing in the different classes. However, if a class is inherently more difficult than others, it will keep asking for annotations even when they are not necessarily helpful, so take what it says onboard but don't feel you need to follow it.
              </p>

              <p style={bodyText}>
                An accuracy score and confusion matrix can also be found in the Information Panel (once the model is trained). This gives you an idea of how well the model is performing, on a set of pixels held out from training. This doesn't necessarily indicate
                its performance in areas you haven't annotated: we can't know that. However, it can give you some measure of the model's success. If you think its struggling and has
                a low accuracy, you can also try changing the model parameters in the Preferences menu {inlineIcon('/segmentation/static/icons/preferences.png', 'preferences')}. Low accuracy
                isn't necessarily a bad thing, and you will usually find the accuracy <i>decreasing</i> over time, because you are adding more and more difficult labels.
              </p>
              <p style={bodyText}>For more tips and advanced use suggestions, check out the FAQs.</p>
            </div>
          )}

          {/* FAQs Tab */}
          {activeTab === 'faqs' && (
            <div>
              <h2 style={sectionHeading}>Annotating Images</h2>

              <button style={accordionBtnStyle(openAccordions.has('painting'))} onClick={() => toggleAccordion('painting')}>
                I'm painting pixels, but nothing's happening!
              </button>
              <div style={panelStyle(openAccordions.has('painting'))}>
                <p>
                  In some projects (including, for example, IRIS' demo) there is a class that is in some sense the background or default, which one does not want to visualise with a coloured overlay. For example, in the case of cloud masking with satellite imagery, pixels
                  for which we can clearly see the surface, and for which no cloud is present, it is much easier to visualise as a clear colour. Upon loading, IRIS defaults to showing you an overlay of the <i>final mask</i> which may use no colour for one of the classes. However,
                  you can switch to the <i>user mask</i> by pressing {inlineIcon('/segmentation/static/icons/mask_user.png', 'user mask')}<b>/</b><span style={keyStyle}>G</span>. In the <i>user mask</i>,
                  one should be able to see more clearly where annotations by the user have been made.
                </p>
                <p>
                  If there is still nothing showing, then make sure you are using the <i>draw tool</i> {inlineIcon('/segmentation/static/icons/pencil.png', 'draw')}<b>/</b><span style={keyStyle}>D</span>, and
                  that your mask is is set to be visible {inlineIcon('/segmentation/static/icons/show_mask.png', 'show mask')}<b>/</b><span style={keyStyle}>Space</span>
                </p>
              </div>

              <button style={accordionBtnStyle(openAccordions.has('pencil-size'))} onClick={() => toggleAccordion('pencil-size')}>
                How can I change the size of the pencil?
              </button>
              <div style={panelStyle(openAccordions.has('pencil-size'))}>
                <p>Press <span style={keyStyle}>Shift</span> while scrolling the mouse wheel.</p>
              </div>

              <button style={accordionBtnStyle(openAccordions.has('undo'))} onClick={() => toggleAccordion('undo')}>
                I would like to undo some changes. How can I do that?
              </button>
              <div style={panelStyle(openAccordions.has('undo'))}>
                <p>
                  Use either the undo {inlineIcon('/segmentation/static/icons/undo.png', 'undo')}<b>/</b><span style={keyStyle}>U</span> command or the eraser {inlineIcon('/segmentation/static/icons/eraser.png', 'eraser')}/<span style={keyStyle}>E</span>.
                </p>
              </div>

              <button style={accordionBtnStyle(openAccordions.has('select-class'))} onClick={() => toggleAccordion('select-class')}>
                How can I select another class for drawing?
              </button>
              <div style={panelStyle(openAccordions.has('select-class'))}>
                <p>
                  Use either the number hotkeys (<span style={keyStyle}>1..9</span>) or click {inlineIcon('/segmentation/static/icons/class.png', 'class')} in the toolbar.
                </p>
              </div>

              <h2 style={{ ...sectionHeading, marginTop: '24px' }}>Saving and Loading</h2>

              <button style={accordionBtnStyle(openAccordions.has('save-progress'))} onClick={() => toggleAccordion('save-progress')}>
                Does IRIS save my progress when I leave?
              </button>
              <div style={panelStyle(openAccordions.has('save-progress'))}>
                <p>It is possible to lose your progress whilst annotating in IRIS, if you navigate away from the page or close the browser without doing one of the following:</p>
                <ul>
                  <li>Clicking save {inlineIcon('/segmentation/static/icons/save_mask.png', 'save')} at the top-left of the IRIS interface. This will allow you to come back to the same image and mask later, as if you had never stopped working on it.</li>
                  <li>Going to the next or previous image.</li>
                </ul>
              </div>

              <button style={accordionBtnStyle(openAccordions.has('image-order'))} onClick={() => toggleAccordion('image-order')}>
                How are images ordered?
              </button>
              <div style={panelStyle(openAccordions.has('image-order'))}>
                <p>The IRIS project can be set up with two different image ordering modes:</p>
                <ul>
                  <li><b>Random:</b> Images are shown in a random order, with the order fixed for each different user (meaning you will always find images in the same order when you come back).</li>
                  <li><b>Prioritise least annotated:</b> Images that are the least annotated are prioritised, so that you are shown images which need more annotations. This can change the order of images dynamically.</li>
                </ul>
                <p>The project administrator can change the image ordering mode on the server by editing the project's configuration files, this cannot be altered by a user.</p>
              </div>

              <button style={accordionBtnStyle(openAccordions.has('questionnaire'))} onClick={() => toggleAccordion('questionnaire')}>
                What is the questionnaire that appears after I have finished an image?
              </button>
              <div style={panelStyle(openAccordions.has('questionnaire'))}>
                <p>
                  The short questionnaire offers you an opportunity to make any notes about the image. This may be useful at a later point for quality control or organisation. The difficulty bar is a useful way to qualitatively rate
                  how you think the labelling went. Checking the box to say that your mask is complete will mark that image as complete for you, and you will not be shown that image again (although if you exhaust all available images
                  then the completed ones may be shown to you again). If you do not check the box, then IRIS will keep track of the fact that you would still like to work on this image later.
                </p>
              </div>

              <h2 style={{ ...sectionHeading, marginTop: '24px' }}>Interacting with the AI</h2>

              <button style={accordionBtnStyle(openAccordions.has('ai-not-learning'))} onClick={() => toggleAccordion('ai-not-learning')}>
                The AI doesn't seem to be learning what I want it to learn
              </button>
              <div style={panelStyle(openAccordions.has('ai-not-learning'))}>
                <p>
                  The AI Assistant in IRIS can be a powerful tool when used correctly. There are several ways one can help the AI model to perform better, however, it will always have limitations in certain situations
                  which may have to be resolved through manual intervention, rather than using the model's predictions. Some of the ways to help the AI are:
                </p>
                <ul>
                  <li><b>Providing high quality labels</b> helps the model by guiding it in its learning process. If the model is struggling to learn over a specific kind of area in the image, try to provide examples from those areas. Counterintuitively, more training data is not always better. Try to provide the model with a diverse set of pixels, rather than a large number of pixels from the same class and the same colour/type of pixel in the image.</li>
                  <li><b>Altering the model parameters</b> can have a big effect on the model's performance. When training data are too few, an overly large model can overfit and produce strange outputs. Meanwhile, if many difficult and diverse labels are given, then the model may struggle to learn the complex relationships between input and output if it is too small. These parameters can be adjusted from the Preferences menu {inlineIcon('/segmentation/static/icons/preferences.png', 'preferences')}.</li>
                  <li><b>Changing the bands</b> used by the model can stop the model from overfitting to input data that is not particularly relevant to the annotations of that image. Like the model's parameters, the bands can be included and excluded in the Preferences menu.</li>
                  <li><b>Post-processing the results</b> with the <i>suppression filter</i> can remove the small (a few pixels wide) areas that the AI assistant picks up. This can be useful to make the mask appear more smooth. However, it should be used with caution, if those small regions are important for the dataset's application.</li>
                </ul>
              </div>

              <button style={accordionBtnStyle(openAccordions.has('more-pixels'))} onClick={() => toggleAccordion('more-pixels')}>
                The information panel keeps telling me to provide more pixels of a certain class
              </button>
              <div style={panelStyle(openAccordions.has('more-pixels'))}>
                <p>
                  The AI assistant computes a confusion matrix using a percentage of the labels you provide, to see how well it is doing in matching your annotations. If the model is struggling with a specific class, then it will prompt
                  you to label more of it. However, what often happens is that the class it desires more labels from is just the most difficult class to label in the image. In this case, the tooltip will continue to ask for more of that
                  class indefinitely, even if a large number of labels is provided. Don't worry if this happens, the AI assistant is never quite satisfied with what you give it, or its own performance!
                </p>
              </div>

              <button style={accordionBtnStyle(openAccordions.has('accuracy-decreasing'))} onClick={() => toggleAccordion('accuracy-decreasing')}>
                I keep labelling more pixels, but the accuracy displayed in the information panel is decreasing!
              </button>
              <div style={panelStyle(openAccordions.has('accuracy-decreasing'))}>
                <p>
                  This is perfectly natural. If you are selecting areas to label based on mistakes the model is making, then you are continuously creating a harder and harder set of pixels for the model to learn from and validate itself
                  with. If anything, a model performance of close to 100% should be more concerning than a lower one, as it may be overfitting to the training data.
                </p>
              </div>
            </div>
          )}

          {/* Hotkeys Tab */}
          {activeTab === 'hotkeys' && (
            <div>
              <div style={{ borderRadius: '8px', border: `1px solid ${theme.modalBorder}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: theme.bgTertiary }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: theme.gray700, borderBottom: `1px solid ${theme.modalBorder}` }}>Command</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: theme.gray700, borderBottom: `1px solid ${theme.modalBorder}` }}>Key</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(HOTKEYS).map(([key, description], index) => (
                      <tr key={key} style={{ backgroundColor: index % 2 === 0 ? 'transparent' : theme.bgSecondary }}>
                        <td style={{ padding: '10px 14px', color: theme.gray900, borderBottom: `1px solid ${theme.modalBorder}` }}>{description}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.modalBorder}` }}><span style={keyStyle}>{key}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div>
              <p style={bodyText}>IRIS was developed by</p>
              <p style={{ ...bodyText, fontWeight: 600 }}>John Mrziglod, Φ-lab, European Space Agency</p>
              <p style={{ ...bodyText, fontWeight: 600 }}>Alistair Francis, Φ-lab, European Space Agency</p>
              <hr style={{ border: 'none', borderTop: `1px solid ${theme.modalBorder}`, margin: '16px 0' }} />
              <p style={bodyText}>
                Find more information on{' '}
                <a href="https://github.com/ESA-PhiLab/iris" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  https://github.com/ESA-PhiLab/iris
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${theme.modalBorder}` }}>
          <button
            onClick={onClose}
            data-testid="close-help-button"
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: theme.primary,
              color: '#fff',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default HelpModal;
