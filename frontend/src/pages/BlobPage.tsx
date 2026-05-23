import '../components/Blob/css/blob.css'
import Accordion from '../components/Accordion/Accordion'
import Blobs from '../components/Blob/Blobs'
import birb from '../assets/blob-birb.png'
import fish from '../assets/blob-fish.png'
import face from '../assets/face.png'
import bubbly from '../assets/bubbly-fish.png'
import dog from '../assets/blob-dog.png'
import { CSSProperties, useState } from 'react'
import { useLanguageContext } from '../contexts/LanguageContext'
import SEO from '../components/SEO/SEO'
import { useModal } from '../hooks/useModal'
import Icon from '../components/Icon/Icon'
import BlobArtLogo from '../components/Icon/BlobArtLogo'

export default function BlobPage({ type }: { type: string }) {
  const { t } = useLanguageContext()

  const [openAccordion, setOpenAccordion] = useState<string | null>(null)

  const toggleAccordion = (accordionName: string) => {
    setOpenAccordion((prev) => (prev === accordionName ? null : accordionName))
  }

  const sampleArtwork = [
    {
      id: 'face',
      src: face,
      alt: t('Face'),
      caption: `${t('SampleArtwork')}: ${t('Face')}`,
    },
    {
      id: 'bubbly',
      src: bubbly,
      alt: t('BubblesAndFish'),
      caption: `${t('SampleArtwork')}: ${t('BubblesAndFish')}`,
    },
    {
      id: 'fish',
      src: fish,
      alt: t('SwimmingFish'),
      caption: `${t('SampleArtwork')}: ${t('SwimmingFish')}`,
    },
    {
      id: 'dog',
      src: dog,
      alt: `${t('Dog')}?`,
      caption: `${t('SampleArtwork')}: ${t('Dog')}?`,
    },
    {
      id: 'bird',
      src: birb,
      alt: t('FlyingBird'),
      caption: `${t('SampleArtwork')}: ${t('FlyingBird')}`,
    },
  ]

  const { show } = useModal()

  const openLightbox = (src: string, alt: string, caption: string) => {
    show({
      title: caption,
      className: 'blob-lightbox-modal',
      children: (
        <figure className="blob-lightbox-figure">
          <img src={src} alt={alt} className="blob-lightbox-image" />
          <figcaption>{caption}</figcaption>
        </figure>
      ),
    })
  }

  const blobStyle: CSSProperties = {
    width: '100%',
    height: 'auto',
    maxWidth: '100%',
    display: 'block',
    margin: '1em auto',
  }
  return (
    <>
      <SEO
        title={`${t('Blobs')} | ${t('BlobAppSlogan')}`}
        description={t('BlobAppIntro')}
        canonicalUrl="https://blobs.jenniina.fi"
      />
      <div className={`blob ${type}`}>
        <div className="inner-wrap">
          <section className="blob-info-section">
            <div className="mt3">
              <div>
                <div className="accordion-row">
                  <Accordion
                    text={
                      <div className="accordion-wrap">
                        <Icon
                          className={`button ${openAccordion === 'instructions' ? 'gray' : ''}`}
                          lib="md"
                          name="MdOutlineInfo"
                          aria-hidden="true"
                        />
                        <span>{t('Instructions')}</span>
                      </div>
                    }
                    className="instructions reset"
                    wrapperClass="instructions-wrap"
                    hideBrackets={true}
                    isOpen={openAccordion === 'instructions'}
                    setIsFormOpen={() => toggleAccordion('instructions')}
                  >
                    <div className="full">
                      <h3>{t('Instructions')}</h3>
                      <h4>{t('PointerUse')}</h4>
                      <ul className="ul medium">
                        <li>
                          {t('ChangeBlobColorByClickingAColorNodeOnTheSides')}
                        </li>
                        <li>
                          {t('ChangeBlobSizeByClickingShrinkOrEnlargeSymbols')}
                        </li>
                        <li>
                          {t('ChangeBlobSizeByScrollingWithTheMouseWheel')}
                        </li>
                        <li>
                          {t('CloneABlobByClickingTheBottomRightCopySign')}.{' '}
                          {t('RememberToDisableTheButtonWhenFinished')}
                        </li>
                        <li>
                          {t('RemoveABlobByClickingTheBottomLeftXSign')}.{' '}
                          {t('RememberToDisableTheButtonWhenFinished')}
                        </li>
                        <li>{t('DragBlobToIconsNextToLayerButtons')}</li>
                        <li>{t('KeysMayBeUsedAfterClickingABlob')}</li>
                        <li>
                          {t('ResizeTheCanvasByDraggingTheCornerHandles')}
                        </li>
                        <li>
                          {t('Layers')}:{' '}
                          <ul>
                            <li>{t('LayerInstructions')}</li>
                            <li>
                              {t(
                                'ChangeTheLayerOfTheFocusedBlobByPressingTheNumber'
                              )}
                            </li>
                            <li>{t('DragBlobToIconsNextToLayerButtons')}</li>
                            <li>
                              {t(
                                'MoveEveryBlobUpOrDownOneLayerByPressingTheButtons'
                              )}
                            </li>
                          </ul>
                        </li>
                        <li>
                          {t('Screenshot')}:
                          <ul>
                            <li>
                              {t('PressTheCameraSymbolToTakeAScreenshot')}
                            </li>
                            <li>{t('PlacesTheImageDownBelow')}</li>
                            <li>
                              {t('DownloadYourArtwork')} ({t('Button')})
                            </li>
                            <li>
                              {t(
                                'YouCanChangeTheDimensionsOfTheScreenshotByResizingYourCanvas'
                              )}
                            </li>
                          </ul>
                        </li>
                      </ul>
                      <h4>{t('KeyboardUse')}</h4>
                      <ul className="ul medium">
                        <li>
                          {t('TabToABlobAndWithItInFocus')}
                          <ul>
                            <li>
                              {t('PressEnterToCycleThroughTheDifferentColors')}
                            </li>
                            <li>{t('MakeBlobSmallerByPressingS')}</li>
                            <li>{t('MakeBlobLargerByPressingBL')}</li>
                            <li>{t('CloneABlobByPressingCOr')}</li>
                            <li>{t('MakeANewRandomBlobByPressingPlus')}</li>
                            <li>{t('RemoveABlobByPressingDeleteOr')}</li>
                            <li>
                              {t(
                                'PressMToToggleMarkerVisibilityWhileUsingTheKeyboard'
                              )}
                            </li>
                            <li>
                              {t(
                                'ChangeTheLayerOfTheFocusedBlobByPressingTheNumber'
                              )}
                            </li>
                            <li>
                              {t(
                                'MoveBlobToBottomByPressingZOrToTopByPressingT'
                              )}
                            </li>{' '}
                            <li>
                              {t(
                                'PressSpaceOrRWithABlobInFocusToCycleThroughRandomColors'
                              )}
                              : {t('OverAThousandPossibleColorCombinations')}
                            </li>
                            <li>{t('ResizeCanvasKeyboardInstructions')} </li>
                            <li>
                              {t('CancelAndRedoFunctionality')}:
                              <ul>
                                <li>
                                  <b>{t('Undo')}:</b> <u>Ctrl + Z</u> or{' '}
                                  <u>Cmd + Z</u>
                                </li>
                                <li>
                                  <b>{t('Redo')}:</b> <u>Ctrl + Shift + Z</u> or{' '}
                                  <u>Ctrl + Y</u> or <u>Cmd + Shift + Z</u>
                                </li>
                              </ul>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </div>
                  </Accordion>
                  <Accordion
                    text={
                      <div className="accordion-wrap">
                        <Icon
                          className={`button ${openAccordion === 'tips' ? 'gray' : ''}`}
                          lib="md"
                          name="MdOutlineTipsAndUpdates"
                          aria-hidden="true"
                          viewBox="-2 -1 23 23"
                          style={{ overflow: 'visible' }}
                        />
                        <span className="label">{t('Tips')}</span>
                      </div>
                    }
                    className="blob-tips-and-tricks reset"
                    wrapperClass="blob-tips-and-tricks-wrap"
                    hideBrackets={true}
                    isOpen={openAccordion === 'tips'}
                    setIsFormOpen={() => toggleAccordion('tips')}
                  >
                    <div className="full">
                      <h2 id="blob-tips-heading">{t('TipsAndTricks')}</h2>
                      <ul
                        className="ul medium"
                        aria-describedby="blob-tips-heading"
                      >
                        <li>
                          {t(
                            'BlobMovementAnnoyingTurnItOffWithTheStopMovementButton'
                          )}
                        </li>
                        <li>
                          {t('IfYouNeedToSetABlobNearTheEdgeOfTheScreen')}.{' '}
                          {t(
                            'YouMayAlsoMoveTheEntireViewWithTheAngleQuotationMarkButtons'
                          )}{' '}
                        </li>
                        <li>{t('YouMayChangeBlobSizeWithTheMouseWheel')} </li>
                        <li>{t('KeysMayBeUsedAfterClickingABlob')} </li>
                        <li>
                          {t('MoreColorsAvailableThroughRandomBlobButton')}.{' '}
                          {t('OverAThousandPossibleColorCombinations')}{' '}
                          {t('YouMayCloneARareColorBlobByPressingCOrD')}
                        </li>
                        <li>
                          {t(
                            'YouCanChangeTheDimensionsOfTheScreenshotByResizingYourCanvas'
                          )}
                        </li>
                        <li>
                          {t(
                            'IfABlobYouClickedHidesAnotherYouMayPlaceTheBlobBackToTheBottomOfThePile'
                          )}
                        </li>
                        <li>
                          {t(
                            'OnTouchscreensTapTheBlobTwiceToShrinkItAndThriceToEnlargeIt'
                          )}
                        </li>
                        <li>
                          {t(
                            'WhichBlobIsCurrentlyActiveCanBeSeenAtTheTopOfTheContainer'
                          )}
                        </li>
                        <li>
                          <>{t('RegisterAndLogInToSaveYourArtwork')}</>
                        </li>
                      </ul>
                    </div>
                  </Accordion>

                  <Accordion
                    text={
                      <div className="accordion-wrap">
                        <Icon
                          className={`button ${openAccordion === 'sample' ? 'gray' : ''}`}
                          lib="pi"
                          name="PiImage"
                          aria-hidden="true"
                        />
                        <span>{t('Examples')}</span>
                      </div>
                    }
                    className="sample-img reset"
                    wrapperClass="sample-img-wrap"
                    hideBrackets={true}
                    isOpen={openAccordion === 'sample'}
                    setIsFormOpen={() => toggleAccordion('sample')}
                  >
                    <>
                      <div className="blob-sample-grid">
                        {sampleArtwork.map((artwork) => (
                          <button
                            key={artwork.id}
                            type="button"
                            className="blob-sample-card"
                            onClick={() =>
                              openLightbox(
                                artwork.src,
                                artwork.alt,
                                artwork.caption
                              )
                            }
                          >
                            <figure>
                              <img
                                src={artwork.src}
                                style={blobStyle}
                                alt={artwork.alt}
                                loading="lazy"
                              />
                              <figcaption>{artwork.caption}</figcaption>
                            </figure>
                          </button>
                        ))}
                      </div>
                    </>
                  </Accordion>
                </div>
              </div>
            </div>
          </section>
          <div className="blob-title-wrap tooltip-wrap">
            <h1 className="blob-title">
              <BlobArtLogo className="blob-title-svg" />
              <b className="scr">{t('BlobArt')}</b>
            </h1>
            <span className="tooltip above narrow2">
              {t('MoreColorsAvailableThroughRandomBlobButton')}
            </span>
          </div>
          <Blobs />
        </div>
      </div>
    </>
  )
}
