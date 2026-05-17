// Static icon imports - only import the specific icons used in the app
import type { ComponentType } from 'react'
import { RiHomeSmileLine, RiMailSendLine } from 'react-icons/ri'
import { IoMdCheckmarkCircleOutline } from 'react-icons/io'
import {
  BiChat,
  BiChevronsUp,
  BiChevronsDown,
  BiChevronsLeft,
  BiChevronsRight,
  BiChevronDown,
  BiChevronUp,
  BiPlus,
  BiUndo,
  BiRedo,
} from 'react-icons/bi'
import { CgUndo } from 'react-icons/cg'
import {
  IoSettingsSharp,
  IoStopCircleOutline,
  IoPlayCircleOutline,
} from 'react-icons/io5'
import { HiArrowsPointingOut } from 'react-icons/hi2'
import { FaAnglesUp } from 'react-icons/fa6'
import {
  MdInvertColors,
  MdInvertColorsOff,
  MdOutlineTipsAndUpdates,
  MdOutlineInfo,
} from 'react-icons/md'
import { PiImage, PiMouseScroll, PiCornersOut } from 'react-icons/pi'
import {
  FaArrowLeft,
  FaArrowRight,
  FaTimes,
  FaPlus,
  FaRegClone,
  FaSave,
} from 'react-icons/fa'
import { TiDeleteOutline } from 'react-icons/ti'
import { TbBlobFilled } from 'react-icons/tb'
import { ImEnlarge2, ImShrink2, ImCamera } from 'react-icons/im'
import { GoTriangleDown, GoTriangleUp } from 'react-icons/go'

export type IconLibrariesShape = Record<
  string,
  Record<string, ComponentType<Record<string, unknown>>>
>

export const iconLibraries = {
  ri: {
    RiHomeSmileLine,
    RiMailSendLine,
  },
  io: {
    IoMdCheckmarkCircleOutline,
  },
  bi: {
    BiChat,
    BiChevronsUp,
    BiChevronsDown,
    BiChevronsLeft,
    BiChevronsRight,
    BiChevronDown,
    BiChevronUp,
    BiPlus,
    BiUndo,
    BiRedo,
  },
  cg: {
    CgUndo,
  },
  io5: {
    IoSettingsSharp,
    IoStopCircleOutline,
    IoPlayCircleOutline,
  },
  hi2: {
    HiArrowsPointingOut,
  },
  fa: {
    FaArrowLeft,
    FaArrowRight,
    FaTimes,
    FaPlus,
    FaRegClone,
    FaSave,
  },
  fa6: {
    FaAnglesUp,
  },
  md: {
    MdInvertColors,
    MdInvertColorsOff,
    MdOutlineTipsAndUpdates,
    MdOutlineInfo,
  },
  pi: {
    PiImage,
    PiMouseScroll,
    PiCornersOut,
  },
  ti: {
    TiDeleteOutline,
  },
  tb: {
    TbBlobFilled,
  },
  im: {
    ImEnlarge2,
    ImShrink2,
    ImCamera,
  },
  go: {
    GoTriangleDown,
    GoTriangleUp,
  },
} as const satisfies IconLibrariesShape
